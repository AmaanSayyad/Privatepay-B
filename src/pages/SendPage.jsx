/**
 * Send & Withdraw page - Updated for Base (EVM).
 * - Send: Transfer ETH/USDC from your wallet to any address (e.g. treasury).
 * - Withdraw: Withdraw your credited balance from the treasury to your wallet.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button, Input, Spinner } from '@nextui-org/react';
import { Send, ArrowDownToLine, ExternalLink, CheckCircle2, AlertCircle, Globe, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { ethers } from 'ethers';
import { useEnsName } from 'wagmi';
import { BASE_LOGO, ENS_LOGO, USDC_LOGO, ETH_LOGO, BITGO_LOGO, USDC_ADDRESS, BASE_TREASURY_ADDRESS, ENS_TREASURY_ADDRESS, baseSepolia, mainnet } from '../config.js';

const USDC_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function balanceOf(address account) public view returns (uint256)",
  "function decimals() public view returns (uint8)"
];

import { getUserBalance, withdrawFunds, getUserByWallet, getUserByUsername, getPaymentLinkByAlias, recordPayment, supabase } from '../lib/supabase.js';
import { useAppWallet } from '../hooks/useAppWallet.js';

// When VITE_BACKEND_URL is set (e.g. local backend on 3400), use it; else use same-origin /api (Vercel serverless)
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || '';
const WITHDRAW_URL = BACKEND_URL ? `${BACKEND_URL}/withdraw` : '/api/withdraw';

export default function SendPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const hash = (location.hash || '#send').replace('#', '') || 'send';
  const [activeTab, setActiveTab] = useState(hash === 'withdraw' ? 'withdraw' : hash === 'ens' ? 'ens' : 'send');

  useEffect(() => {
    const h = (location.hash || '#send').replace('#', '') || 'send';
    setActiveTab(h === 'withdraw' ? 'withdraw' : h === 'ens' ? 'ens' : 'send');
  }, [location.hash]);

  const setTab = (tab) => {
    setActiveTab(tab);
    navigate(`/send#${tab}`, { replace: true });
  };

  return (
    <div className="w-full min-h-screen flex flex-col items-center overflow-y-auto bg-light-white">
      <div className="flex flex-col items-center py-20 w-full">
        <div className="w-full max-w-lg flex flex-col items-center gap-4 pt-12 pb-24 px-4">
          <div className="flex rounded-2xl bg-primary-100 p-1 w-full">
          <button
            type="button"
            onClick={() => setTab('send')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${activeTab === 'send' ? 'bg-primary text-white shadow' : 'text-primary-700 hover:bg-primary-50'
              }`}
          >
            <Send className="size-5" />
            Send
          </button>
          <button
            type="button"
            onClick={() => setTab('withdraw')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${activeTab === 'withdraw' ? 'bg-primary text-white shadow' : 'text-primary-700 hover:bg-primary-50'
              }`}
          >
            <ArrowDownToLine className="size-5" />
            Withdraw
          </button>
          <button
            type="button"
            onClick={() => setTab('ens')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${activeTab === 'ens' ? 'bg-primary text-white shadow' : 'text-primary-700 hover:bg-primary-50'
              }`}
          >
            <Globe className="size-5" />
            ENS
          </button>
          </div>

          {activeTab === 'send' && <SendTab />}
          {activeTab === 'withdraw' && <WithdrawTab />}
          {activeTab === 'ens' && <EnsTab />}
        </div>
      </div>
    </div>
  );
}

function SendTab() {
  const { account, isConnected, connect, signer } = useAppWallet();
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('0.1');
  const [currency, setCurrency] = useState('ETH'); // 'ETH' or 'USDC'
  const [transferLoading, setTransferLoading] = useState(false);
  const [lastTx, setLastTx] = useState(null);

  const handleTransfer = async () => {
    if (!isConnected || !signer) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!recipient.trim() || !amount) {
      toast.error('Please enter recipient and amount');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Invalid amount');
      return;
    }

    // Alıcı kullanıcı adı / alias'ını çöz
    const rawRecipient = recipient.trim();
    const alias = rawRecipient.replace(/\.privatepay\.base$/i, '').replace(/\.privatepay$/i, '').replace(/\.eth$/i, '').toLowerCase().trim();
    const isEnsInput = rawRecipient.toLowerCase().endsWith('.eth');

    let recipientUsername = null;    // Supabase'de balance yazılacak username
    let recipientWalletAddress = null; // Supabase users/payment_links kayıtlı cüzdan (bilgi amaçlı)

    try {
      // 1. users tablosunda username olarak ara
      const userByName = await getUserByUsername(alias);
      if (userByName) {
        recipientUsername = userByName.username;
        recipientWalletAddress = userByName.wallet_address;
      }

      // 1.1 ENS Name Search in Supabase
      if (!recipientUsername && (isEnsInput || true)) {
        const { data: userByEns } = await supabase
          .from('users')
          .select('username, wallet_address, ens_name')
          .ilike('ens_name', rawRecipient.toLowerCase())
          .maybeSingle();
        
        if (userByEns) {
          recipientUsername = userByEns.username;
          recipientWalletAddress = userByEns.wallet_address;
        }
      }
      if (!recipientUsername && supabase) {
        // 2. payment_links tablosunda alias olarak ara
        const linkByAlias = await getPaymentLinkByAlias(alias);
        if (linkByAlias) {
          recipientUsername = linkByAlias.alias || linkByAlias.username;
          recipientWalletAddress = linkByAlias.wallet_address;
        }
      }

      if (!recipientUsername && supabase) {
        // 3. payment_links tablosunda username olarak ara
        const { data: linkByUser } = await supabase
          .from('payment_links')
          .select('wallet_address, alias, username')
          .eq('username', alias)
          .maybeSingle();
        if (linkByUser) {
          recipientUsername = linkByUser.alias || linkByUser.username;
          recipientWalletAddress = linkByUser.wallet_address;
        }
      }

      // 3.5 Live ENS Resolution (L1) if still not found
      if (!recipientUsername && isEnsInput) {
        toast.loading('Resolving ENS name...', { id: 'ens-resolving' });
        try {
          const rpcUrl = import.meta.env.VITE_ETH_MAINNET_RPC_URL || mainnet.rpcUrls.default.http[0];
          console.log(`[SendPage] Resolving "${rawRecipient}" using RPC: ${rpcUrl}`);
          
          const provider = new ethers.JsonRpcProvider(rpcUrl, 1, { staticNetwork: true });
          const resolved = await provider.resolveName(rawRecipient);
          toast.dismiss('ens-resolving');

          if (resolved) {
            console.log(`[SendPage] Resolved "${rawRecipient}" to:`, resolved);
            // Check if this resolved wallet is in our DB
            const userByWallet = await getUserByWallet(resolved);
            if (userByWallet) {
              recipientUsername = userByWallet.username;
              recipientWalletAddress = userByWallet.wallet_address;
            } else {
              // Not a Private-Pay user yet, but valid address
              recipientUsername = rawRecipient.toLowerCase();
              recipientWalletAddress = resolved;
            }
          } else {
            console.warn(`[SendPage] Could not resolve ENS name: ${rawRecipient}`);
          }
        } catch (e) {
          toast.dismiss('ens-resolving');
          console.error('[SendPage] ENS resolution failed:', e);
        }
      }

      // 4. Fallback: 0x adresi girilmişse users'ta wallet_address ile ara
      if (!recipientUsername && ethers.isAddress(rawRecipient) && supabase) {
        const userByWallet = await getUserByWallet(rawRecipient);
        if (userByWallet) {
          recipientUsername = userByWallet.username;
          recipientWalletAddress = userByWallet.wallet_address;
        } else {
          // Henüz kayıtlı değil, cüzdan adresini username gibi kullan
          recipientUsername = rawRecipient.toLowerCase();
          recipientWalletAddress = rawRecipient;
        }
      }

      if (!recipientUsername) {
        toast.error(`"${alias}" not found! Please enter a valid username or wallet address.`);
        return;
      }
    } catch (err) {
      console.error('Recipient resolution error:', err);
      toast.error('Recipient not found, please try again');
      return;
    }

    // Send to treasury (not directly to recipient — privacy shield)
    const treasuryAddress = BASE_TREASURY_ADDRESS;
    if (!treasuryAddress || !ethers.isAddress(treasuryAddress)) {
      toast.error('Treasury address not configured!');
      return;
    }

    try {
      setTransferLoading(true);
      toast.loading('Submitting transaction...', { id: 'tx-loading' });

      let tx;
      if (currency === 'ETH') {
        tx = await signer.sendTransaction({
          to: treasuryAddress,
          value: ethers.parseEther(amount.toString()),
        });
      } else {
        // USDC Transfer
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
        const decimals = 6; // USDC on Base Sepolia usually has 6
        const amountWei = ethers.parseUnits(amount.toString(), decimals);
        tx = await usdcContract.transfer(treasuryAddress, amountWei);
      }

      toast.loading('Awaiting blockchain confirmation...', { id: 'tx-loading' });
      const receipt = await tx.wait();

      toast.dismiss('tx-loading');

      if (!receipt || receipt.status === 0) {
        throw new Error('Transaction failed on-chain');
      }

      // Credit recipient balance in Supabase
      await recordPayment(account, recipientUsername, amountNum, tx.hash, { currency });

      window.dispatchEvent(new Event('balance-updated'));
      window.dispatchEvent(new Event('transactions-updated'));

      const shortHash = tx.hash ? `${tx.hash.slice(0, 8)}...${tx.hash.slice(-6)}` : '';
      const explorerUrl = baseSepolia.blockExplorers.default.url;
      setLastTx({
        hash: tx.hash,
        explorerLink: `${explorerUrl}/tx/${tx.hash}`,
        recipientUsername
      });

      toast.success(
        (t) => (
          <div onClick={() => { window.open(`${explorerUrl}/tx/${tx.hash}`, '_blank'); toast.dismiss(t.id); }} className="cursor-pointer">
            <p className="font-bold">✅ Sent!</p>
            <p className="text-xs text-gray-600">Recipient: <span className="font-mono font-bold">{recipientUsername}</span> ({currency})</p>
            <p className="text-xs text-gray-500">TX: {shortHash} (click to view)</p>
          </div>
        ),
        { duration: 8000 }
      );

      setAmount('0.1');
      setRecipient('');
    } catch (error) {
      toast.dismiss('tx-loading');
      setTransferLoading(false);
      const code = error?.code ?? error?.info?.error?.code;
      const msg = (error?.message || '').toLowerCase();
      if (code === 4001 || code === 'ACTION_REJECTED' || msg.includes('rejected') || msg.includes('denied')) {
        toast.error('Transaction cancelled. Click Confirm in your wallet to send.');
        return;
      }
      console.error('[Send] Transfer failed:', error);
      toast.error(error.message?.slice(0, 80) || 'Transfer failed');
    } finally {
      setTransferLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full bg-white border border-gray-200 shadow-md rounded-3xl">
        <CardBody className="p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center p-3">
            <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">Connect wallet to send</h3>
            <p className="text-gray-500 text-sm">Connect your wallet to send private ETH transfers.</p>
          </div>
          <Button onClick={connect} className="w-full bg-primary hover:bg-primary-800 text-white font-bold h-12 rounded-2xl">
            Connect Wallet
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white border border-gray-200 shadow-md rounded-3xl">
      <CardBody className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center p-2">
            <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Private Transfer (Base)</h3>
            <p className="text-xs text-gray-500">Recipient wallet stays hidden — routed via Treasury</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setCurrency('ETH')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${currency === 'ETH' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <img src={ETH_LOGO} className="size-4" alt="ETH" />
            ETH
          </button>
          <button
            onClick={() => setCurrency('USDC')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${currency === 'USDC' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <img src={USDC_LOGO} className="size-4" alt="USDC" />
            USDC
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Recipient (username or 0x address)</label>
            <input
              type="text"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="alice or alice.privatepay.base or 0x..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount ({currency})</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.0"
              step="0.0001"
              min="0"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            />
          </div>
          {lastTx && (
            <div className="p-4 rounded-2xl border bg-green-50 border-green-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-bold text-green-900">Transfer Complete</span>
                </div>
                <a href={lastTx.explorerLink} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1 text-green-700">
                  View <ExternalLink size={12} />
                </a>
              </div>
              <p className="text-xs text-green-600 mt-1">Recipient balance updated: <span className="font-bold">{lastTx.recipientUsername}</span></p>
            </div>
          )}
          <Button
            onClick={handleTransfer}
            isLoading={transferLoading}
            isDisabled={!recipient || !amount || transferLoading}
            className="w-full bg-primary hover:bg-primary-800 text-white font-semibold h-12 rounded-2xl"
            startContent={!transferLoading && <Send size={18} />}
          >
            {transferLoading ? 'Sending...' : 'Send Privately'}
          </Button>
          <p className="text-xs text-gray-500 text-center">🔒 Private routing via Treasury — recipient identity protected</p>
        </div>
      </CardBody>
    </Card>
  );
}

function WithdrawTab() {
  const { account, isConnected } = useAppWallet();
  const [username, setUsername] = useState('');
  const [ethBalance, setEthBalance] = useState(0);
  const [usdcBalance, setUsdcBalance] = useState(0);
  const [currency, setCurrency] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [destination, setDestination] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingBalance, setLoadingBalance] = useState(true);

  const balance = currency === 'USDC' ? usdcBalance : ethBalance;

  useEffect(() => {
    if (!account) {
      setLoadingBalance(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const un = localStorage.getItem(`base_username_${account}`) || account?.slice(-8) || 'user';

      if (!cancelled) setUsername(un);
      try {
        const user = await getUserByWallet(account);
        const resolvedUsername = user?.username ?? un;
        if (!cancelled) setUsername(resolvedUsername);
        const balanceData = await getUserBalance(resolvedUsername);
        if (!cancelled) {
          setEthBalance(Number(balanceData?.eth_balance || 0));
          setUsdcBalance(Number(balanceData?.usdc_balance || 0));
          setDestination(account);
        }
      } catch (e) {
        if (!cancelled) {
          setEthBalance(0);
          setUsdcBalance(0);
        }
      } finally {
        if (!cancelled) setLoadingBalance(false);
      }
    })();
    return () => { cancelled = true; };
  }, [account]);

  const setMaxAmount = () => {
    const max = Math.max(0, balance - 0.0001);
    setAmount(String(max.toFixed(4)));
  };

  const handleWithdraw = async () => {
    if (!isConnected || !account) {
      toast.error('Connect your wallet first');
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amt > balance) {
      toast.error('Insufficient balance');
      return;
    }
    if (!destination?.trim()) {
      toast.error('Enter destination address');
      return;
    }

    let finalDestination = destination.trim();
    // Alias çözümleme: 0x ile başlamıyorsa alias/username olarak kabul et
    if (!finalDestination.startsWith('0x') && finalDestination.length > 0) {
      try {
        const alias = finalDestination.replace(/\.privatepay\.base$/i, '').replace(/\.privatepay$/i, '').toLowerCase().trim();
        // 1. Önce users tablosunda ara
        let user = await getUserByUsername(alias);
        if (user && user.wallet_address) {
          finalDestination = user.wallet_address;
        } else {
          // 2. payment_links tablosunda alias olarak ara
          const linkByAlias = await getPaymentLinkByAlias(alias);
          if (linkByAlias && linkByAlias.wallet_address) {
            finalDestination = linkByAlias.wallet_address;
          } else if (supabase) {
            // 3. payment_links tablosunda username olarak ara
            const { data: linkByUsername } = await supabase
              .from('payment_links')
              .select('wallet_address')
              .eq('username', alias)
              .maybeSingle();
            if (linkByUsername && linkByUsername.wallet_address) {
              finalDestination = linkByUsername.wallet_address;
            } else {
              toast.error(`Kullanıcı "${alias}" bulunamadı!`);
              return;
            }
          } else {
            toast.error(`Kullanıcı "${alias}" bulunamadı!`);
            return;
          }
        }
      } catch (err) {
        console.error("Alias çözümlenirken hata:", err);
        toast.error("Alias çözümlenemedi, lütfen tekrar deneyin");
        return;
      }
    }

    if (!ethers.isAddress(finalDestination)) {
      toast.error('Invalid destination address format');
      return;
    }

    setLoading(true);
    try {
      const pKey = import.meta.env.VITE_TREASURY_PRIVATE_KEY || import.meta.env.TREASURY_PRIVATE_KEY;
      if (!pKey) {
        throw new Error('Treasury private key is not configured in .env file');
      }

      toast.loading('Processing withdrawal from treasury...', { id: 'withdraw-loading' });

      // Initialize provider and treasury wallet
      const rpcProvider = new ethers.JsonRpcProvider(baseSepolia.rpcUrls.default.http[0]);
      const treasuryWallet = new ethers.Wallet(pKey, rpcProvider);

      let tx;
      if (currency === 'ETH') {
        // Native withdrawal
        const tBalance = await rpcProvider.getBalance(treasuryWallet.address);
        if (tBalance < ethers.parseEther(amount.toString())) {
          throw new Error('Treasury ETH balance too low');
        }
        tx = await treasuryWallet.sendTransaction({
          to: finalDestination,
          value: ethers.parseEther(amount.toString()),
        });
      } else {
        // USDC withdrawal
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, treasuryWallet);
        const decimals = 6;
        const amountWei = ethers.parseUnits(amount.toString(), decimals);

        const tBalance = await usdcContract.balanceOf(treasuryWallet.address);
        if (tBalance < amountWei) {
          throw new Error('Treasury USDC balance too low');
        }
        tx = await usdcContract.transfer(finalDestination, amountWei);
      }

      toast.loading('Waiting for blockchain confirmation...', { id: 'withdraw-loading' });
      await tx.wait();

      // Deduct balance and add transaction string to Supabase
      await withdrawFunds(username, amt, finalDestination, tx.hash, currency);

      toast.dismiss('withdraw-loading');
      window.dispatchEvent(new Event('balance-updated'));
      window.dispatchEvent(new Event('transactions-updated'));

      toast.success(
        <div>
          <p className="font-bold">Withdrew {amt.toFixed(4)} {currency}!</p>
          <a href={`${baseSepolia.blockExplorers.default.url}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">View on Explorer</a>
        </div>
      );

      setAmount('');
      if (currency === 'ETH') {
        setEthBalance((b) => Math.max(0, b - amt));
      } else {
        setUsdcBalance((b) => Math.max(0, b - amt));
      }
    } catch (err) {
      toast.dismiss('withdraw-loading');
      console.error('[Withdraw]', err);
      if (err.message?.includes('Insufficient balance') || err.message?.includes('balance is too low')) {
        toast.error(err.message || 'Insufficient balance');
      } else if (err.message?.includes('Supabase')) {
        toast.error('Blockchain transfer succeeded but could not update dashboard balance. Check connection.');
      } else {
        toast.error('Withdrawal failed: ' + (err.message?.slice(0, 50) || 'Unknown error'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full bg-white border border-gray-200 shadow-md rounded-3xl">
        <CardBody className="p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center p-3">
            <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">Connect wallet to withdraw</h3>
            <p className="text-gray-500 text-sm">Withdraw your credited balance from the treasury to your wallet.</p>
          </div>
          <Button onClick={connect} className="w-full bg-primary hover:bg-primary-800 text-white font-bold h-12 rounded-2xl">
            Connect Wallet
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white border border-gray-200 shadow-md rounded-3xl">
      <CardBody className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center p-2">
            <img src={BASE_LOGO} alt="Base" className="w-full h-full object-contain" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">Withdraw from treasury</h3>
            <p className="text-xs text-gray-500">Move your credited balance from the treasury to your wallet</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4 p-1 bg-gray-100 rounded-2xl">
          <button
            onClick={() => setCurrency('ETH')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${currency === 'ETH' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <img src={ETH_LOGO} alt="ETH" className="size-5 rounded-full object-contain shrink-0" />
            ETH
          </button>
          <button
            onClick={() => setCurrency('USDC')}
            className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${currency === 'USDC' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <img src={USDC_LOGO} alt="USDC" className="size-5 rounded-full object-contain shrink-0" />
            USDC
          </button>
        </div>

        <div className="mb-4 p-4 rounded-2xl bg-primary-50 border border-primary-100">
          <p className="text-xs text-primary-700 font-medium">Your credited {currency === 'ETH' ? 'ETH' : 'USDC'} balance</p>
          {loadingBalance ? (
            <p className="text-xl font-bold text-primary-900">...</p>
          ) : (
            <p className="text-xl font-bold text-primary-900">{balance.toFixed(currency === 'USDC' ? 2 : 4)} {currency === 'ETH' ? 'ETH' : 'USDC'}</p>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Amount ({currency === 'ETH' ? 'ETH' : 'USDC'})</label>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.0"
                step="0.0001"
                min="0"
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
              />
              <Button size="sm" variant="flat" className="bg-primary-100 text-primary font-semibold rounded-2xl" onPress={setMaxAmount}>
                Max
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">Destination (your Base wallet or .privatepay.base)</label>
            <input
              type="text"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="0x... or alice.privatepay.base"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
            />
          </div>

          <div className="p-4 rounded-2xl bg-primary-50 border border-primary-100 flex gap-3">
            <AlertCircle className="size-5 text-primary-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-primary-800">
              The relayer sends funds from the single treasury to your wallet. Your balance is what senders have credited to you.
            </p>
          </div>

          <Button
            onClick={handleWithdraw}
            isLoading={loading}
            isDisabled={loadingBalance || !amount || parseFloat(amount) <= 0 || parseFloat(amount) > balance || !destination?.trim()}
            className="w-full bg-primary hover:bg-primary-800 text-white font-semibold h-12 rounded-2xl"
            startContent={!loading && <ArrowDownToLine size={18} />}
          >
            {loading ? 'Processing...' : 'Withdraw'}
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}

function EnsTab() {
  const { account, isConnected, connect, signer } = useAppWallet();
  const { data: userEnsName } = useEnsName({ address: account, chainId: 1 });
  const [recipient, setRecipient] = useState('');
  const [resolvedAddress, setResolvedAddress] = useState('');
  const [amount, setAmount] = useState('0.01');
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState(false);

  const resolveENS = async (name) => {
    const trimmedName = (name || '').trim();
    if (!trimmedName || !trimmedName.includes('.')) {
      setResolvedAddress('');
      return;
    }
    if (/^[\d.]+$/.test(trimmedName)) {
      setResolvedAddress('');
      return;
    }
    setResolving(true);
    try {
      const rpcUrl = import.meta.env.VITE_ETH_MAINNET_RPC_URL || mainnet.rpcUrls.default.http[0];
      const provider = new ethers.JsonRpcProvider(rpcUrl, 1, { staticNetwork: true });
      const address = await provider.resolveName(trimmedName);
      setResolvedAddress(address || '');
    } catch (e) {
      console.error('[EnsTab] ENS resolution error:', e);
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

  const handleSendShielded = async () => {
    if (!isConnected || !signer) {
      toast.error('Connect wallet first');
      return;
    }
    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    const MIN_ETH = 0.00001;
    if (amountNum < MIN_ETH) {
      toast.error(`Minimum amount is ${MIN_ETH} ETH (dust amounts can fail on-chain)`);
      return;
    }
    setLoading(true);
    const trimmedRecipient = recipient.trim();
    let target = resolvedAddress;
    try {
      const network = await signer.provider.getNetwork();
      const expectedChainId = BigInt(baseSepolia.id);
      if (network.chainId !== expectedChainId) {
        toast.error(`Switch to Base Sepolia in your wallet (current: ${network.chainId})`);
        setLoading(false);
        return;
      }
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
      const tx = await signer.sendTransaction({
        to: ENS_TREASURY_ADDRESS,
        value: ethers.parseEther(amount),
      });
      toast.loading('Confirming transaction...', { id: 'ens-tx' });
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) {
        toast.error('Transaction reverted on-chain. Check your wallet network (use Base Sepolia).', { id: 'ens-tx' });
        setLoading(false);
        return;
      }
      const explorerUrl = baseSepolia.blockExplorers.default.url;
      toast.success(
        <div>
          <p className="font-bold">Transfer sent (privacy shielded)</p>
          <a href={`${explorerUrl}/tx/${tx.hash}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">View on Base Sepolia Explorer</a>
        </div>,
        { id: 'ens-tx', duration: 8000 }
      );
      await recordPayment(account, trimmedRecipient, amountNum, tx.hash, { currency: 'SEPOLIA_ETH' });
      setAmount('0.01');
      setRecipient('');
      setResolvedAddress('');
    } catch (e) {
      console.error('[EnsTab] Transfer error:', e);
      toast.dismiss('jit-ens');
      toast.error(e?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  if (!isConnected) {
    return (
      <Card className="w-full bg-white border border-gray-200 shadow-md rounded-3xl">
        <CardBody className="p-8 flex flex-col items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 flex items-center justify-center p-3">
            <img src={ENS_LOGO} alt="ENS" className="size-10 object-contain" />
          </div>
          <div className="text-center space-y-2">
            <h3 className="text-xl font-bold text-gray-900">Connect wallet for ENS</h3>
            <p className="text-gray-500 text-sm">Resolve .eth names and send shielded ETH via ENS Treasury.</p>
          </div>
          <Button onClick={connect} className="w-full bg-primary hover:bg-primary-800 text-white font-bold h-12 rounded-2xl">
            Connect Wallet
          </Button>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="w-full bg-white border border-gray-200 shadow-md rounded-3xl">
      <CardBody className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl bg-primary-50 flex items-center justify-center p-2 shrink-0">
            <img src={ENS_LOGO} alt="ENS" className="size-6 object-contain" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">ENS + Base</h3>
            <p className="text-xs text-gray-500">Resolve .eth names (Ethereum mainnet) and send on Base. Your ENS: {userEnsName || 'none'}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-500 px-1 uppercase tracking-wider">Recipient (ENS or 0x...)</label>
            <Input
              placeholder="vitalik.eth or 0x..."
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              variant="bordered"
              radius="lg"
              classNames={{ inputWrapper: 'border-neutral-200' }}
              endContent={resolving ? <Spinner size="sm" /> : null}
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
              Sending to the ENS Treasury obfuscates your identity. Standard gas fees apply. Use <strong>Base Sepolia</strong> in your wallet.
            </p>
          </div>

          <Button
            onClick={handleSendShielded}
            isLoading={loading}
            isDisabled={!recipient || !amount}
            className="w-full bg-primary h-12 text-white font-semibold rounded-full"
            startContent={!loading && <Send className="size-5" />}
          >
            Send Shielded ETH
          </Button>
        </div>
      </CardBody>
    </Card>
  );
}
