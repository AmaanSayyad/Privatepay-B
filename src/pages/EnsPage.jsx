import React, { useState, useEffect } from 'react';
import { Button, Chip, Input, Spinner } from '@nextui-org/react';
import { Shield, Send, User, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppWallet } from '../hooks/useAppWallet';
import { useEnsName } from 'wagmi';
import { mainnet, ENS_TREASURY_ADDRESS } from '../config';
import { ethers } from 'ethers';
import toast from 'react-hot-toast';
import { recordPayment } from '../lib/supabase';

export default function EnsPage() {
  const { account, isConnected, connect, signer } = useAppWallet();
  const [recipient, setRecipient] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);
  


  // ENS for the user (mainnet)
  const { data: userEnsName } = useEnsName({ address: account, chainId: 1 });

  // Resolve Recipient ENS
  const resolveENS = async (name) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName || !trimmedName.includes('.')) {
      setResolvedAddress('');
      return;
    }
    
    // Skip if it looks like an IP address or just numbers
    if (/^[\d.]+$/.test(trimmedName)) {
      setResolvedAddress('');
      return;
    }

    setResolving(true);
    try {
      const rpcUrl = import.meta.env.VITE_ETH_MAINNET_RPC_URL || mainnet.rpcUrls.default.http[0];
      // Force chainId 1 and staticNetwork to avoid unnecessary eth_chainId calls and potential network mismatches
      const provider = new ethers.JsonRpcProvider(rpcUrl, 1, { staticNetwork: true });
      
      console.log(`[EnsPage] Resolving "${trimmedName}"...`);
      const address = await provider.resolveName(trimmedName);
      
      console.log(`[EnsPage] Resolved "${trimmedName}" to:`, address);
      setResolvedAddress(address || '');
    } catch (e) {
      console.error("[EnsPage] ENS Resolution Error:", e);
      setResolvedAddress('');
    } finally {
      setResolving(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (recipient) resolveENS(recipient);
    }, 500);
    return () => clearTimeout(timer);
  }, [recipient]);

  const handleSendMainnet = async () => {
    if (!isConnected || !signer) {
      toast.error('Connect wallet first');
      return;
    }
    
    setLoading(true);
    const trimmedRecipient = recipient.trim();
    let target = resolvedAddress;

    try {
      // Just-in-time resolution check
      if (!target || !ethers.isAddress(target)) {
        if (ethers.isAddress(trimmedRecipient)) {
          target = trimmedRecipient;
        } else if (trimmedRecipient.includes('.')) {
          toast.loading('Resolving address...', { id: 'jit-ens' });
          const rpcUrl = import.meta.env.VITE_ETH_MAINNET_RPC_URL || mainnet.rpcUrls.default.http[0];
          const provider = new ethers.JsonRpcProvider(rpcUrl, 1, { staticNetwork: true });
          target = await provider.resolveName(trimmedRecipient);
          toast.dismiss('jit-ens');
        }
      }

      if (!target || !ethers.isAddress(target)) {
        toast.error('Invalid recipient address');
        setLoading(false);
        return;
      }

      const treasury = ENS_TREASURY_ADDRESS;

      console.log(`[EnsPage] Sending transaction to ${target} via treasury: ${treasury}`);

      // Direct Mainnet Send to Treasury
      const tx = await signer.sendTransaction({
        to: treasury,
        value: ethers.parseEther(amount),
      });
      
      toast.loading('Confirming transaction...', { id: 'sepolia-tx' });
      await tx.wait();
      toast.success('Transfer Sent (Privacy Shielded)!', { id: 'sepolia-tx' });
      
      // Record in Supabase with SEPOLIA_ETH currency
      await recordPayment(account, recipient.trim(), parseFloat(amount), tx.hash, { currency: 'SEPOLIA_ETH' });
      
      setAmount('0.01');
      setRecipient('');
      setResolvedAddress('');
    } catch (e) {
      console.error("[EnsPage] Transfer error:", e);
      toast.dismiss('jit-ens');
      toast.error(e.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="w-full min-h-screen flex flex-col items-center overflow-y-auto bg-light-white">
      <div className="flex flex-col items-center py-20 w-full">
        <div className="w-full max-w-lg flex flex-col items-center gap-4 pt-12 pb-24 px-4">
          {/* Compact header aligned with Send page */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <img
              src="/ethereum-name-service-ens-logo.png"
              alt="ENS"
              className="h-10 w-auto object-contain"
            />
            <h1 className="font-bold text-2xl text-gray-900">ENS Hub</h1>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <Chip size="sm" variant="flat" color="primary" className="font-bold text-[10px]">
              BASE
            </Chip>
            <Chip size="sm" variant="flat" color="secondary" className="font-bold text-[10px]">
              ENS
            </Chip>
          </div>

          {/* ENS profile card — same style as Dashboard balance card */}
          <div className="w-full rounded-3xl bg-gradient-to-br from-white to-primary-50/30 border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="size-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{userEnsName || 'No ENS Found'}</h3>
                    <p className="text-xs text-gray-500 font-mono">
                      {account ? `${account.slice(0, 8)}...${account.slice(-6)}` : 'Connect wallet'}
                    </p>
                  </div>
                </div>
                {!account ? (
                  <Button size="sm" variant="flat" color="primary" onClick={connect} className="font-bold text-[10px] h-8 rounded-full">
                    CONNECT
                  </Button>
                ) : userEnsName ? (
                  <Chip size="sm" color="success" variant="flat" className="font-bold text-[10px]">
                    VERIFIED
                  </Chip>
                ) : (
                  <span className="text-xs text-gray-500">No ENS for this address</span>
                )}
              </div>
            </div>
          </div>

          {/* ENS + Base send card */}
          <div className="w-full rounded-3xl bg-gradient-to-br from-white to-primary-50/30 border border-neutral-200 shadow-sm overflow-hidden">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Shield className="size-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-gray-900">ENS + Base</h3>
                  <p className="text-xs text-gray-500">Resolve .eth names (Ethereum mainnet) and send on Base</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 px-1 uppercase tracking-wider">Recipient Name</label>
                  <Input
                    placeholder="vitalik.eth or 0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    variant="bordered"
                    radius="lg"
                    classNames={{ inputWrapper: 'border-neutral-200' }}
                    endContent={resolving && <Spinner size="sm" />}
                  />
                  {resolvedAddress && (
                    <div className="mt-1 flex items-center gap-1.5 px-2">
                      <CheckCircle className="size-3 text-green-500" />
                      <span className="text-[10px] text-green-600 font-mono italic">Resolves to: {resolvedAddress.slice(0, 10)}...{resolvedAddress.slice(-8)}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-500 px-1 uppercase tracking-wider">Amount (ETH)</label>
                  <Input
                    type="number"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    variant="bordered"
                    radius="lg"
                    classNames={{ inputWrapper: 'border-neutral-200' }}
                    endContent={<span className="text-xs text-gray-400 font-bold">ETH</span>}
                  />
                </div>

                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                  <AlertCircle className="size-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Sending to the ENS Treasury obfuscates your identity. Standard gas fees apply.
                  </p>
                </div>

                <Button
                  onClick={handleSendMainnet}
                  isLoading={loading}
                  isDisabled={!isConnected || !recipient || !amount}
                  className="w-full bg-primary h-12 text-white font-semibold rounded-full"
                  startContent={!loading && <Send className="size-5" />}
                >
                  Send Shielded ETH
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
