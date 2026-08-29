import { useState, useEffect } from 'react';
import { useEnsName, useEnsAvatar } from 'wagmi';
import { mainnet } from '../config';
import { supabase } from '../lib/supabase';

/**
 * Hook to fetch ENS data for a wallet address and sync it with Supabase.
 * @param {string} address - The wallet address to check.
 */
export function useEnsProfile(address) {
  const [ensData, setEnsData] = useState({ name: null, avatar: null, loading: false });

  // Wagmi hooks for ENS (requires mainnet configuration in Wagmi provider)
  const { data: ensName, isLoading: nameLoading } = useEnsName({
    address: address,
    chainId: 1, // Always check mainnet for ENS
  });

  const { data: ensAvatar, isLoading: avatarLoading } = useEnsAvatar({
    name: ensName,
    chainId: 1,
  });

  useEffect(() => {
    if (address && ensName && !nameLoading && !avatarLoading) {
      syncEnsWithSupabase(address, ensName, ensAvatar);
    }
    
    setEnsData({
      name: ensName,
      avatar: ensAvatar,
      loading: nameLoading || avatarLoading
    });
  }, [address, ensName, ensAvatar, nameLoading, avatarLoading]);

  return ensData;
}

/**
 * Sync ENS data to Supabase users table
 */
async function syncEnsWithSupabase(address, name, avatar) {
  if (!address || !name) return;
  
  try {
    const { error } = await supabase
      .from('users')
      .update({ 
        ens_name: name,
        ens_avatar: avatar
      })
      .eq('wallet_address', address.toLowerCase());
      
    if (error) {
      console.warn('[ENS Sync] Could not sync ENS to database:', error.message);
    } else {
      console.log('[ENS Sync] Successfully synced ENS for', address);
    }
  } catch (err) {
    console.error('[ENS Sync] Error:', err);
  }
}
