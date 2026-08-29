import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (import.meta.env.DEV && supabaseUrl) {
  console.log('[Supabase] Using URL:', supabaseUrl.replace(/\/$/, '').split('/').pop());
}

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase configuration missing! App will work but database features will be disabled.', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

// Validate that URL doesn't look like an error message
if (supabaseUrl && (supabaseUrl.includes('<') || supabaseUrl.includes('Per anonym'))) {
  console.error('❌ Supabase URL appears to be corrupted HTML:', supabaseUrl.substring(0, 100));
  // Don't throw - allow app to continue without Supabase
}

// Create Supabase client with fallback values if missing
// This allows the app to load even without Supabase configured
export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'public' },
    auth: { persistSession: false },
  })
  : null; // Return null if not configured - functions will handle this

// Helper function to validate Supabase responses
const validateSupabaseResponse = (data, error, operation) => {
  // Check if data is HTML instead of JSON
  if (data && typeof data === 'string') {
    const trimmedData = data.trim();
    if (trimmedData.startsWith('<') || trimmedData.includes('<!DOCTYPE') || trimmedData.includes('Per anonym')) {
      console.error(`❌ Supabase ${operation} returned HTML:`, data.substring(0, 100));
      throw new Error(`Supabase ${operation} failed: Server returned HTML instead of JSON. Database may be unreachable.`);
    }
  }

  // Check if error contains HTML
  if (error && error.message && typeof error.message === 'string') {
    if (error.message.includes('<') || error.message.includes('Per anonym') || error.message.includes('<!DOCTYPE')) {
      console.error(`❌ Supabase ${operation} error contains HTML:`, error.message.substring(0, 100));
      throw new Error(`Supabase ${operation} failed: Server returned HTML error page. Database may be unreachable.`);
    }
  }

  return { data, error };
};

/** Points system disabled — set to true to re-enable awarding and events */
const POINTS_ENABLED = false;

// Database Tables:
// 1. users: id, wallet_address, username, created_at
// 2. payments: id, sender_address, recipient_username, amount, tx_hash, status, created_at
// 3. balances: id, username, wallet_address, eth_balance, usdc_balance, sepolia_eth_balance, bitgo_teth_balance, created_at, updated_at
// 4. payment_links: id, wallet_address, username, alias, created_at

/**
 * Register or get user
 */
export async function registerUser(walletAddress, username) {
  if (!supabase) {
    console.warn('Supabase not configured. Skipping user registration.');
    return null;
  }
  try {
    // Check if user exists
    const { data: existingUser, error: fetchError } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.warn('Error checking existing user, proceeding with registration attempt:', fetchError);
    }

    if (existingUser) {
      // Update username if changed
      if (existingUser.username !== username) {
        const { data, error } = await supabase
          .from('users')
          .update({ username })
          .eq('wallet_address', walletAddress)
          .select()
          .maybeSingle();

        if (error) throw error;
        return data;
      }
      return existingUser;
    }

    // Create new user
    const { data, error: insertError } = await supabase
      .from('users')
      .insert([{ wallet_address: walletAddress, username }])
      .select()
      .maybeSingle();

    if (insertError) {
      if (insertError.code === '23505') { // Duplicate key
        const { data: retryUser } = await supabase
          .from('users')
          .select('*')
          .eq('wallet_address', walletAddress)
          .maybeSingle();
        return retryUser;
      }
      throw insertError;
    }

    // Initialize balance
    await supabase
      .from('balances')
      .insert([{
        username,
        wallet_address: walletAddress,
        eth_balance: 0,
        usdc_balance: 0,
        bitgo_teth_balance: 0
      }]);

    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Record incoming payment
 */
export async function recordPayment(senderAddress, recipientUsername, amount, txHash, options = {}) {
  if (!supabase) {
    console.warn('Supabase not configured. Skipping payment recording.');
    return null;
  }
  try {
    const currency = options.currency || 'ETH';
    // Record payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        sender_address: senderAddress,
        recipient_username: recipientUsername,
        amount: parseFloat(amount),
        currency,
        tx_hash: txHash,
        status: 'completed'
      }])
      .select()
      .maybeSingle();

    if (paymentError) {
      console.error('Error in recordPayment insert:', paymentError);
      throw paymentError;
    }

    // Update balance
    let { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('*')
      .eq('username', recipientUsername)
      .maybeSingle();

    if (balanceError) throw balanceError;

    // Resolve wallet address to check for existing record by wallet (unique constraint protection)
    const { data: userRef } = await supabase.from('users').select('wallet_address').eq('username', recipientUsername).maybeSingle();
    let walletAddr = userRef?.wallet_address;

    if (!walletAddr) {
      const { data: linkRef } = await supabase.from('payment_links').select('wallet_address').eq('alias', recipientUsername).maybeSingle();
      walletAddr = linkRef?.wallet_address;
    }

    // Protection: If we didn't find the balance by username, but we have a wallet address, check by wallet
    if (!balance && walletAddr) {
      const { data: balanceByWallet } = await supabase
        .from('balances')
        .select('*')
        .eq('wallet_address', walletAddr)
        .maybeSingle();
      if (balanceByWallet) balance = balanceByWallet;
    }

    // If balance record doesn't exist anywhere, create it
    if (!balance) {
      const balanceObj = {
        username: recipientUsername,
        wallet_address: walletAddr || recipientUsername,
        eth_balance: currency === 'ETH' ? parseFloat(amount) : 0,
        usdc_balance: currency === 'USDC' ? parseFloat(amount) : 0,
        sepolia_eth_balance: currency === 'SEPOLIA_ETH' ? parseFloat(amount) : 0,
        bitgo_teth_balance: currency === 'BITGO_TETH' ? parseFloat(amount) : 0,
      };

      const { data: newBalanceData, error: createError } = await supabase
        .from('balances')
        .insert([balanceObj])
        .select()
        .maybeSingle();

      if (createError) throw createError;
      balance = newBalanceData;
    } else {
      let balanceField;
      if (currency === 'USDC') {
        balanceField = 'usdc_balance';
      } else if (currency === 'SEPOLIA_ETH') {
        balanceField = 'sepolia_eth_balance';
      } else if (currency === 'BITGO_TETH') {
        balanceField = 'bitgo_teth_balance';
      } else {
        balanceField = 'eth_balance';
      }
      const currentVal = parseFloat(balance[balanceField] || 0);
      const newVal = currentVal + parseFloat(amount);

      // Update the record
      await supabase
        .from('balances')
        .update({
          [balanceField]: newVal,
          updated_at: new Date().toISOString()
        })
        .eq('username', balance.username);
    }

    // Points: award to sender and recipient (disabled when POINTS_ENABLED is false)
    if (POINTS_ENABLED) {
      try {
        const senderWallet = (senderAddress || '').trim();
        if (senderWallet) {
          await awardPoints(senderWallet, 'payment_sent', { description: `Payment sent: ${amount} ${currency}`, relatedPaymentId: payment?.id });
          const { data: sentList } = await supabase.from('payments').select('id').eq('sender_address', senderWallet).limit(2);
          if (sentList?.length === 1) await awardPoints(senderWallet, 'first_payment', { relatedPaymentId: payment?.id });
        }
        let recipientWallet = (await supabase.from('users').select('wallet_address').eq('username', recipientUsername).maybeSingle()).data?.wallet_address;
        if (!recipientWallet) {
          const { data: balanceRef } = await supabase.from('balances').select('wallet_address').eq('username', recipientUsername).maybeSingle();
          recipientWallet = balanceRef?.wallet_address;
        }
        if (!recipientWallet) {
          const byUsername = await supabase.from('payment_links').select('wallet_address').eq('username', recipientUsername).limit(1).maybeSingle();
          const byAlias = await supabase.from('payment_links').select('wallet_address').eq('alias', recipientUsername).limit(1).maybeSingle();
          recipientWallet = byUsername.data?.wallet_address || byAlias.data?.wallet_address;
        }
        recipientWallet = (recipientWallet || '').trim();
        if (recipientWallet) {
          await awardPoints(recipientWallet, 'payment_received', { description: `Payment received: ${amount} ${currency}`, relatedPaymentId: payment?.id });
          const { data: recvList } = await supabase.from('payments').select('id').eq('recipient_username', recipientUsername).limit(2);
          if (recvList?.length === 1) await awardPoints(recipientWallet, 'first_received', { relatedPaymentId: payment?.id });
        }
        window.dispatchEvent(new Event('points-updated'));
      } catch (e) {
        console.warn('Points award failed:', e);
      }
    }

    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    // Check if error message contains HTML
    if (error.message && typeof error.message === 'string' && error.message.includes('<')) {
      console.error('Supabase returned HTML error page during payment recording');
      throw new Error('Database is unreachable. Payment may not have been recorded.');
    }
    throw error;
  }
}

/**
 * Get user balance
 */
export async function getUserBalance(username) {
  if (!supabase) {
    console.warn('Supabase not configured. Returning default balance.');
    return { eth_balance: 0, usdc_balance: 0 };
  }
  try {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data || { eth_balance: 0, usdc_balance: 0, sepolia_eth_balance: 0, bitgo_teth_balance: 0 };
  } catch (error) {
    console.error('Error getting balance:', error);
    return { eth_balance: 0, usdc_balance: 0, sepolia_eth_balance: 0, bitgo_teth_balance: 0 };
  }
}

/**
 * Get user balance by wallet address
 */
export async function getUserBalanceByWallet(walletAddress) {
  if (!supabase || !walletAddress) return { eth_balance: 0, usdc_balance: 0, sepolia_eth_balance: 0 };
  try {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error) throw error;
    return data || { eth_balance: 0, usdc_balance: 0, sepolia_eth_balance: 0 };
  } catch (error) {
    console.error('Error getting balance by wallet:', error);
    return { eth_balance: 0, usdc_balance: 0, sepolia_eth_balance: 0, bitgo_teth_balance: 0 };
  }
}

/**
 * Get user payments (received and sent)
 */
export async function getUserPayments(username) {
  if (!supabase) {
    console.warn('Supabase not configured. Returning empty payments list.');
    return [];
  }
  try {
    // 1. Get the wallet address for this username
    const { data: user } = await supabase
      .from('users')
      .select('wallet_address, username')
      .eq('username', username)
      .maybeSingle();

    let walletAddress = user?.wallet_address;
    let allAliases = [username];

    // 2. If we have a wallet, find all associated aliases/usernames
    if (walletAddress) {
      const { data: links } = await supabase
        .from('payment_links')
        .select('alias, username')
        .eq('wallet_address', walletAddress);

      if (links) {
        links.forEach(l => {
          if (l.alias) allAliases.push(l.alias);
          if (l.username) allAliases.push(l.username);
        });
      }
    }

    // De-duplicate aliases
    allAliases = [...new Set(allAliases.filter(Boolean))];

    // 3. Get received payments for ANY of these aliases
    const { data: receivedPayments, error: receivedError } = await supabase
      .from('payments')
      .select('*')
      .in('recipient_username', allAliases)
      .order('created_at', { ascending: false });

    if (receivedError) throw receivedError;

    // 4. Get sent payments (using wallet address)
    let sentPayments = [];
    if (walletAddress) {
      const { data: sent, error: sentError } = await supabase
        .from('payments')
        .select('*')
        .eq('sender_address', walletAddress)
        .order('created_at', { ascending: false });

      if (!sentError && sent) {
        sentPayments = sent.map(payment => ({
          ...payment,
          is_sent: true
        }));
      }
    }

    // Combine and sort by date
    const allPayments = [...(receivedPayments || []), ...sentPayments]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return allPayments;
  } catch (error) {
    console.error('Error getting payments:', error);
    return [];
  }
}

/**
 * Withdraw funds
 */
export async function withdrawFunds(username, amount, destinationAddress, txHash, currency = 'ETH') {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot withdraw funds.');
    throw new Error('Supabase not configured');
  }
  try {
    // Get current balance
    const { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    validateSupabaseResponse(balance, balanceError, 'withdrawFunds.getBalance');

    if (balanceError) throw balanceError;

    let balanceField;
    if (currency === 'USDC') {
      balanceField = 'usdc_balance';
    } else if (currency === 'SEPOLIA_ETH') {
      balanceField = 'sepolia_eth_balance';
    } else {
      balanceField = 'eth_balance';
    }
    
    const currentBalance = parseFloat(balance?.[balanceField] || 0);

    if (!balance || currentBalance < amount) {
      throw new Error(`Insufficient ${currency === 'SEPOLIA_ETH' ? 'Sepolia ETH' : currency} balance`);
    }

    // Record withdrawal
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('payments')
      .insert([{
        sender_address: 'treasury',
        recipient_username: username,
        amount: -parseFloat(amount),
        currency,
        tx_hash: txHash,
        status: 'withdrawn'
      }])
      .select()
      .maybeSingle();

    validateSupabaseResponse(withdrawal, withdrawalError, 'withdrawFunds.recordWithdrawal');

    if (withdrawalError) throw withdrawalError;

    // Update balance
    const newBalance = currentBalance - parseFloat(amount);
    const { error: updateError } = await supabase
      .from('balances')
      .update({
        [balanceField]: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('username', username);

    if (updateError) {
      validateSupabaseResponse(null, updateError, 'withdrawFunds.updateBalance');
      throw updateError;
    }

    if (POINTS_ENABLED) {
      try {
        if (balance.wallet_address) {
          await awardPoints(balance.wallet_address, 'payment_withdrawn', { description: `Withdrawal: ${amount} ${currency}`, relatedPaymentId: withdrawal?.id });
          window.dispatchEvent(new Event('points-updated'));
        }
      } catch (e) {
        console.warn('Points award for withdrawal failed:', e);
      }
    }

    return { success: true, newBalance };
  } catch (error) {
    console.error('❌ Error withdrawing funds from Supabase:', error);

    // Check if error message contains HTML or "Per anonym"
    const errorStr = error?.message || error?.toString() || '';
    if (errorStr.includes('<') || errorStr.includes('Per anonym') || errorStr.includes('<!DOCTYPE')) {
      console.error('🚨 Supabase returned HTML error page during withdrawal');
      throw new Error('Database is unreachable or returned an error page. Your funds were transferred on-chain successfully, but the balance may not be updated in the dashboard.');
    }

    // Check for JSON parsing errors
    if (errorStr.includes('Unexpected token') || errorStr.includes('JSON')) {
      console.error('🚨 JSON parsing error - likely received HTML instead of JSON');
      throw new Error('Database returned invalid data. Your transaction succeeded on the blockchain, but balance tracking failed.');
    }

    // Check for network/connection errors
    if (errorStr.includes('Failed to fetch') || errorStr.includes('Network')) {
      console.error('🚨 Network connection error');
      throw new Error('Cannot connect to database. Please check your internet connection.');
    }

    throw error;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username) {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot get user.');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();

    // Validate response
    validateSupabaseResponse(data, error, 'getUserByUsername');

    if (error) {
      // Handle "not found" gracefully
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    // Check if error message contains HTML
    if (error.message && typeof error.message === 'string' && error.message.includes('<')) {
      console.error('Supabase returned HTML error page');
      throw new Error('Database is unreachable. Please check your connection.');
    }
    return null;
  }
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress) {
  if (!supabase || !walletAddress) {
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .maybeSingle();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting user by wallet:', error);
    return null;
  }
}

/**
 * Check if alias/username is available (not taken by another user or payment link)
 */
export async function isAliasAvailable(alias) {
  if (!supabase || !alias) return false;
  try {
    const normalized = String(alias).toLowerCase().trim();
    const { data: existingLink } = await supabase.from('payment_links').select('id').eq('alias', normalized).maybeSingle();
    if (existingLink) return false;
    const { data: existingUser } = await supabase.from('users').select('id').eq('username', normalized).maybeSingle();
    return !existingUser;
  } catch (error) {
    console.error('Error checking alias:', error);
    return false;
  }
}

/**
 * Update username for wallet (Supabase + localStorage). Creates payment link with new alias if available.
 */
export async function updateUsername(walletAddress, newUsername) {
  if (!supabase || !walletAddress || !newUsername) {
    throw new Error('Missing wallet or username');
  }
  const normalized = String(newUsername).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!normalized) throw new Error('Invalid username');

  const available = await isAliasAvailable(normalized);
  if (!available) throw new Error('Username already taken');

  const { data: user, error: userError } = await supabase
    .from('users')
    .update({ username: normalized })
    .eq('wallet_address', walletAddress)
    .select()
    .maybeSingle();

  if (userError) throw userError;

  try {
    await createPaymentLink(walletAddress, normalized, normalized);
  } catch (e) {
    if (!e.message?.includes('duplicate') && e?.code !== '23505') console.warn('Could not create payment link for new username:', e);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(`base_username_${walletAddress}`, normalized);
  }
  return user;
}

/**
 * Get payments for a wallet (received + sent), using DB username then fallbacks
 */
export async function getPaymentsByWallet(walletAddress, fallbackUsername) {
  if (!supabase) return [];
  try {
    const user = await getUserByWallet(walletAddress);
    const username = user?.username ?? fallbackUsername ?? (walletAddress ? walletAddress.slice(-8) : null);
    if (!username) return [];
    return getUserPayments(username);
  } catch (error) {
    console.error('Error getting payments by wallet:', error);
    return [];
  }
}

/**
 * Create payment link
 */
export async function createPaymentLink(walletAddress, username, alias) {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot create payment link.');
    throw new Error('Supabase not configured');
  }
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .insert([{
        wallet_address: walletAddress,
        username,
        alias
      }])
      .select()
      .maybeSingle();

    if (error) throw error;

    if (POINTS_ENABLED) {
      try {
        const walletForPoints = (walletAddress || '').trim();
        if (walletForPoints) {
          await awardPoints(walletForPoints, 'payment_link_created', { description: `Payment link created: ${alias}`, relatedPaymentLinkId: data?.id });
        }
        window.dispatchEvent(new Event('points-updated'));
      } catch (e) {
        console.warn('Points award failed:', e);
      }
    }

    return data;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

/**
 * Get payment links by wallet address
 */
export async function getPaymentLinks(walletAddress) {
  if (!supabase) {
    console.warn('Supabase not configured. Returning empty payment links.');
    return [];
  }
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting payment links:', error);
    return [];
  }
}

/**
 * Get payment link by alias
 */
export async function getPaymentLinkByAlias(alias) {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot get payment link.');
    return null;
  }
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*')
      .eq('alias', alias)
      .maybeSingle();

    validateSupabaseResponse(data, error, 'getPaymentLinkByAlias');

    if (error) {
      // Handle "not found" gracefully
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting payment link:', error);
    // Check if error message contains HTML
    if (error.message && typeof error.message === 'string' && error.message.includes('<')) {
      console.error('Supabase returned HTML error page');
      throw new Error('Database is unreachable. Please check your connection.');
    }
    return null;
  }
}

/**
 * Delete payment link by id
 */
export async function deletePaymentLink(id) {
  if (!supabase) {
    console.warn('Supabase not configured. Cannot delete payment link.');
    throw new Error('Supabase not configured');
  }
  try {
    const { error } = await supabase
      .from('payment_links')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting payment link:', error);
    throw error;
  }
}

// =============================================================================
// POINTS SYSTEM
// =============================================================================

export async function getUserPoints(walletAddress) {
  const normalized = (walletAddress || '').trim();
  if (!supabase || !normalized) return { totalPoints: 0, lifetimePoints: 0, level: 1 };
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('*')
      .eq('wallet_address', normalized)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) {
      const { data: newData, error: insertError } = await supabase
        .from('user_points')
        .insert([{ wallet_address: normalized, total_points: 0, lifetime_points: 0, level: 1 }])
        .select()
        .single();
      if (insertError) throw insertError;
      return { totalPoints: newData.total_points || 0, lifetimePoints: newData.lifetime_points || 0, level: newData.level || 1 };
    }
    return { totalPoints: data.total_points || 0, lifetimePoints: data.lifetime_points || 0, level: data.level || 1 };
  } catch (error) {
    console.error('Error getting user points:', error);
    return { totalPoints: 0, lifetimePoints: 0, level: 1 };
  }
}

export async function awardPoints(walletAddress, actionType, options = {}) {
  const normalized = (walletAddress || '').trim();
  if (!supabase || !normalized) return 0;
  try {
    const { data, error } = await supabase.rpc('award_points', {
      p_wallet_address: normalized,
      p_action_type: actionType,
      p_description: options.description || null,
      p_related_payment_id: options.relatedPaymentId || null,
      p_related_payment_link_id: options.relatedPaymentLinkId || null,
      p_metadata: options.metadata || null,
    });
    if (error) throw error;
    return data ?? 0;
  } catch (error) {
    console.error('Error awarding points:', error);
    return 0;
  }
}

export async function getPointsHistory(walletAddress, limit = 50) {
  const normalized = (walletAddress || '').trim();
  if (!supabase || !normalized) return [];
  try {
    const { data, error } = await supabase
      .from('point_transactions')
      .select('*')
      .eq('wallet_address', normalized)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting points history:', error);
    return [];
  }
}

export async function getPointsLeaderboard(limit = 100) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_points')
      .select('id, wallet_address, total_points, lifetime_points, level')
      .order('lifetime_points', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

export async function getPointsConfig() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('points_config')
      .select('*')
      .eq('is_active', true)
      .order('points_value', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting points config:', error);
    return [];
  }
}

/**
 * Save a newly generated BitGo address
 */
export async function saveBitGoAddress(username, walletAddress, bitgoAddress, label = '') {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('bitgo_addresses')
      .insert([{ username, wallet_address: walletAddress, bitgo_address: bitgoAddress, label }])
      .select()
      .single();
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error saving BitGo address:', error);
    throw error;
  }
}

/**
 * Get all BitGo addresses for a user
 */
export async function getBitGoAddresses(username) {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('bitgo_addresses')
      .select('*')
      .eq('username', username)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting BitGo addresses:', error);
    return [];
  }
}

