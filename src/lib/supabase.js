/**
 * Database layer — Neon Postgres via POST /api/db.
 *
 * The file name and every exported function signature are unchanged from the
 * Supabase version so the 12 components importing from here keep working
 * untouched. What changed is what sits behind them: there is no browser-side
 * database client and no anon key any more — all access goes through the
 * server-side action allow-list in api/db.js.
 *
 * Tables: users, payments, balances, payment_links, user_points,
 *         point_transactions, points_config, bitgo_addresses
 */

const API_BASE = (import.meta.env?.VITE_BACKEND_URL || '').replace(/\/$/, '');
const DB_ENDPOINT = `${API_BASE}/api/db`;

/**
 * Kept as a named export because a few modules import it to check "is the
 * database configured?". It is no longer a client object — there is nothing
 * to configure in the browser — so it is always truthy.
 */
export const supabase = { configured: true };

async function call(action, params = {}) {
  const response = await fetch(DB_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, params }),
  });

  const text = await response.text();

  // The old Supabase layer guarded against HTML error pages reaching JSON.parse;
  // a misrouted /api/db can do the same, so keep the guard.
  const trimmed = text.trim();
  if (trimmed.startsWith('<') || trimmed.includes('<!DOCTYPE')) {
    throw new Error(
      `Database request "${action}" failed: server returned HTML instead of JSON. The API may be unreachable.`
    );
  }

  let body;
  try {
    body = trimmed ? JSON.parse(trimmed) : {};
  } catch {
    throw new Error(`Database request "${action}" returned invalid JSON.`);
  }

  if (!response.ok) {
    throw new Error(body?.message || body?.error || `Database request "${action}" failed.`);
  }
  return body.data;
}

/** Points system disabled — set to true to re-enable awarding and events */
const POINTS_ENABLED = false;

const EMPTY_BALANCE = {
  eth_balance: 0,
  usdc_balance: 0,
  sepolia_eth_balance: 0,
  bitgo_teth_balance: 0,
};

/**
 * Register or get user
 */
export async function registerUser(walletAddress, username) {
  try {
    return await call('registerUser', { walletAddress, username });
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Record incoming payment
 */
export async function recordPayment(senderAddress, recipientUsername, amount, txHash, options = {}) {
  try {
    const currency = options.currency || 'BOT';
    const payment = await call('recordPayment', {
      senderAddress,
      recipientUsername,
      amount,
      txHash,
      currency,
    });

    if (POINTS_ENABLED) {
      try {
        const senderWallet = (senderAddress || '').trim();
        if (senderWallet) {
          await awardPoints(senderWallet, 'payment_sent', {
            description: `Payment sent: ${amount} ${currency}`,
            relatedPaymentId: payment?.id,
          });
        }
        const recipient = await getUserByUsername(recipientUsername);
        const recipientWallet = (recipient?.wallet_address || '').trim();
        if (recipientWallet) {
          await awardPoints(recipientWallet, 'payment_received', {
            description: `Payment received: ${amount} ${currency}`,
            relatedPaymentId: payment?.id,
          });
        }
        window.dispatchEvent(new Event('points-updated'));
      } catch (e) {
        console.warn('Points award failed:', e);
      }
    }

    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw error;
  }
}

/**
 * Get user balance
 */
export async function getUserBalance(username) {
  try {
    const data = await call('getUserBalance', { username });
    return data || { ...EMPTY_BALANCE };
  } catch (error) {
    console.error('Error getting balance:', error);
    return { ...EMPTY_BALANCE };
  }
}

/**
 * Get user balance by wallet address
 */
export async function getUserBalanceByWallet(walletAddress) {
  if (!walletAddress) return { ...EMPTY_BALANCE };
  try {
    const data = await call('getUserBalanceByWallet', { walletAddress });
    return data || { ...EMPTY_BALANCE };
  } catch (error) {
    console.error('Error getting balance by wallet:', error);
    return { ...EMPTY_BALANCE };
  }
}

/**
 * Get user payments (received and sent)
 */
export async function getUserPayments(username) {
  try {
    return (await call('getUserPayments', { username })) || [];
  } catch (error) {
    console.error('Error getting payments:', error);
    return [];
  }
}

/**
 * Withdraw funds
 */
export async function withdrawFunds(username, amount, destinationAddress, txHash, currency = 'BOT') {
  try {
    const result = await call('withdrawFunds', { username, amount, destinationAddress, txHash, currency });

    if (POINTS_ENABLED) {
      try {
        const balance = await call('getUserBalance', { username });
        if (balance?.wallet_address) {
          await awardPoints(balance.wallet_address, 'payment_withdrawn', {
            description: `Withdrawal: ${amount} ${currency}`,
            relatedPaymentId: result?.withdrawal?.id,
          });
          window.dispatchEvent(new Event('points-updated'));
        }
      } catch (e) {
        console.warn('Points award for withdrawal failed:', e);
      }
    }

    return { success: true, newBalance: result.newBalance };
  } catch (error) {
    console.error('Error withdrawing funds:', error);
    const errorStr = error?.message || String(error);
    if (errorStr.includes('Failed to fetch') || errorStr.includes('Network')) {
      throw new Error('Cannot connect to database. Please check your internet connection.');
    }
    throw error;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username) {
  try {
    return await call('getUserByUsername', { username });
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

/**
 * Get user by wallet address
 */
export async function getUserByWallet(walletAddress) {
  if (!walletAddress) return null;
  try {
    return await call('getUserByWallet', { walletAddress });
  } catch (error) {
    console.error('Error getting user by wallet:', error);
    return null;
  }
}

/**
 * Look up a user by their cached ENS name
 */
export async function getUserByEnsName(ensName) {
  if (!ensName) return null;
  try {
    return await call('getUserByEnsName', { ensName });
  } catch (error) {
    console.error('Error getting user by ENS name:', error);
    return null;
  }
}

/**
 * Cache a resolved ENS name/avatar on the user row
 */
export async function syncEnsProfile(walletAddress, ensName, ensAvatar) {
  if (!walletAddress || !ensName) return null;
  try {
    return await call('syncEnsProfile', { walletAddress, ensName, ensAvatar });
  } catch (error) {
    console.warn('[ENS Sync] Could not sync ENS to database:', error.message);
    return null;
  }
}

/**
 * Get payment link by the username it was created under (not the alias)
 */
export async function getPaymentLinkByUsername(username) {
  if (!username) return null;
  try {
    return await call('getPaymentLinkByUsername', { username });
  } catch (error) {
    console.error('Error getting payment link by username:', error);
    return null;
  }
}

/**
 * Check if alias/username is available (not taken by another user or payment link)
 */
export async function isAliasAvailable(alias) {
  if (!alias) return false;
  try {
    const result = await call('isAliasAvailable', { alias });
    return Boolean(result?.available);
  } catch (error) {
    console.error('Error checking alias:', error);
    return false;
  }
}

/**
 * Update username for wallet (database + localStorage). Creates payment link with new alias if available.
 */
export async function updateUsername(walletAddress, newUsername) {
  if (!walletAddress || !newUsername) {
    throw new Error('Missing wallet or username');
  }
  const normalized = String(newUsername).toLowerCase().trim().replace(/[^a-z0-9]/g, '');
  if (!normalized) throw new Error('Invalid username');

  const available = await isAliasAvailable(normalized);
  if (!available) throw new Error('Username already taken');

  const user = await call('updateUsername', { walletAddress, username: normalized });

  try {
    await createPaymentLink(walletAddress, normalized, normalized);
  } catch (e) {
    if (!e.message?.includes('duplicate')) {
      console.warn('Could not create payment link for new username:', e);
    }
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
  try {
    const user = await getUserByWallet(walletAddress);
    const username =
      user?.username ?? fallbackUsername ?? (walletAddress ? walletAddress.slice(-8) : null);
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
  try {
    const data = await call('createPaymentLink', { walletAddress, username, alias });

    if (POINTS_ENABLED) {
      try {
        const walletForPoints = (walletAddress || '').trim();
        if (walletForPoints) {
          await awardPoints(walletForPoints, 'payment_link_created', {
            description: `Payment link created: ${alias}`,
            relatedPaymentLinkId: data?.id,
          });
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
  try {
    return (await call('getPaymentLinks', { walletAddress })) || [];
  } catch (error) {
    console.error('Error getting payment links:', error);
    return [];
  }
}

/**
 * Get payment link by alias
 */
export async function getPaymentLinkByAlias(alias) {
  try {
    return await call('getPaymentLinkByAlias', { alias });
  } catch (error) {
    console.error('Error getting payment link:', error);
    return null;
  }
}

/**
 * Delete payment link by id
 */
export async function deletePaymentLink(id) {
  try {
    return await call('deletePaymentLink', { id });
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
  if (!normalized) return { totalPoints: 0, lifetimePoints: 0, level: 1 };
  try {
    const data = await call('getUserPoints', { walletAddress: normalized });
    return {
      totalPoints: data?.total_points || 0,
      lifetimePoints: data?.lifetime_points || 0,
      level: data?.level || 1,
    };
  } catch (error) {
    console.error('Error getting user points:', error);
    return { totalPoints: 0, lifetimePoints: 0, level: 1 };
  }
}

export async function awardPoints(walletAddress, actionType, options = {}) {
  const normalized = (walletAddress || '').trim();
  if (!normalized) return 0;
  try {
    const result = await call('awardPoints', {
      walletAddress: normalized,
      actionType,
      description: options.description || null,
      relatedPaymentId: options.relatedPaymentId || null,
      relatedPaymentLinkId: options.relatedPaymentLinkId || null,
      metadata: options.metadata || null,
    });
    return result?.points ?? 0;
  } catch (error) {
    console.error('Error awarding points:', error);
    return 0;
  }
}

export async function getPointsHistory(walletAddress, limit = 50) {
  const normalized = (walletAddress || '').trim();
  if (!normalized) return [];
  try {
    return (await call('getPointsHistory', { walletAddress: normalized, limit })) || [];
  } catch (error) {
    console.error('Error getting points history:', error);
    return [];
  }
}

export async function getPointsLeaderboard(limit = 100) {
  try {
    return (await call('getPointsLeaderboard', { limit })) || [];
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

export async function getPointsConfig() {
  try {
    return (await call('getPointsConfig')) || [];
  } catch (error) {
    console.error('Error getting points config:', error);
    return [];
  }
}

/**
 * Save a newly generated BitGo address
 */
export async function saveBitGoAddress(username, walletAddress, bitgoAddress, label = '') {
  try {
    return await call('saveBitGoAddress', { username, walletAddress, bitgoAddress, label });
  } catch (error) {
    console.error('Error saving BitGo address:', error);
    throw error;
  }
}

/**
 * Get all BitGo addresses for a user
 */
export async function getBitGoAddresses(username) {
  try {
    return (await call('getBitGoAddresses', { username })) || [];
  } catch (error) {
    console.error('Error getting BitGo addresses:', error);
    return [];
  }
}
