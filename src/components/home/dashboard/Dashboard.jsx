import { useEffect, useState, useRef } from "react";
import { cnm } from "../../../utils/style";
import { Button, Skeleton, Spinner, Chip } from "@nextui-org/react";
import QrCodeIcon from "../../../assets/icons/qr-code.svg?react";
import CopyIcon from "../../../assets/icons/copy.svg?react";
import { motion } from "framer-motion";
import QrDialog from "../../dialogs/QrDialog.jsx";
import PaymentLinksDashboard from "./PaymentLinksDashboard.jsx";
import toast from "react-hot-toast";
import { Icons } from "../../shared/Icons.jsx";
import { useNavigate } from "react-router-dom";
import { useAppWallet } from "../../../hooks/useAppWallet.js";
import { getUserBalance, registerUser, updateUsername } from "../../../lib/supabase.js";
import BalanceChart from "./BalanceChart.jsx";
import { notifyPaymentReceived, requestNotificationPermission } from "../../../utils/pwa-utils.js";
import { PAYMENT_LINK_SUFFIX, ETH_LOGO, USDC_LOGO, BITGO_LOGO } from "../../../config.js";
import { useEnsProfile } from "../../../hooks/useEnsProfile.js";
import { Globe } from "lucide-react";

export default function Dashboard() {
  const [openQr, setOpenQr] = useState(false);
  const { account } = useAppWallet();
  const [balance, setBalance] = useState({ eth: 0, usdc: 0, bitgo: 0 });
  const [selectedCurrency, setSelectedCurrency] = useState("ETH");
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const previousBalanceRef = useRef({ eth: 0, usdc: 0, bitgo: 0 });

  useEffect(() => {
    async function loadBalance() {
      if (account) {
        const username = localStorage.getItem(`base_username_${account}`) || account?.slice(-8) || "user";

        try {
          await registerUser(account, username);
        } catch (error) {
          console.error("Error registering user:", error);
        }

        const balanceData = await getUserBalance(username);
        const ethBal = Number(balanceData?.eth_balance || 0);
        const usdcBal = Number(balanceData?.usdc_balance || 0);
        const bitgoBal = Number(balanceData?.bitgo_teth_balance || 0);
        
        setBalance({ eth: ethBal, usdc: usdcBal, bitgo: bitgoBal }); 
        setIsLoadingBalance(false);

        if (previousBalanceRef.current.eth > 0 && ethBal > previousBalanceRef.current.eth) {
          const received = (ethBal - previousBalanceRef.current.eth).toFixed(4);
          const hasPermission = await requestNotificationPermission();
          if (hasPermission) notifyPaymentReceived(`${received} ETH`, null);
        }
        previousBalanceRef.current = { eth: ethBal, usdc: usdcBal };
      } else {
        setBalance({ eth: 0, usdc: 0, bitgo: 0 });
        setIsLoadingBalance(false);
        previousBalanceRef.current = { eth: 0, usdc: 0, bitgo: 0 };
      }
    }

    loadBalance();

    const handleBalanceUpdate = () => loadBalance();
    window.addEventListener("balance-updated", handleBalanceUpdate);
    return () => window.removeEventListener("balance-updated", handleBalanceUpdate);
  }, [account]);

  return (
    <>
      <QrDialog open={openQr} setOpen={setOpenQr} />

      <motion.div
        layoutScroll
        className="w-full min-h-screen flex flex-col items-center overflow-y-auto bg-light-white"
      >
        <div className="flex flex-col items-center py-20 w-full">
          <div className="w-full max-w-lg flex flex-col items-center gap-4 pt-12 pb-24">
            <ReceiveCard setOpenQr={setOpenQr} />
            <MergedBalanceCard 
              balance={balance} 
              isLoading={isLoadingBalance} 
              selectedCurrency={selectedCurrency}
              setSelectedCurrency={setSelectedCurrency}
            />
            <PaymentLinksDashboard />
          </div>
        </div>
      </motion.div>
    </>
  );
}

function ReceiveCard({ setOpenQr, user, isLoading }) {
  const { account, isConnected } = useAppWallet();
  const [mode, setMode] = useState("username");
  const [username, setUsername] = useState("");
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const { name: ensName } = useEnsProfile(account);

  // Load username from localStorage
  useEffect(() => {
    if (account) {
      const savedUsername = localStorage.getItem(`base_username_${account}`);

      if (savedUsername) {
        setUsername(savedUsername);
      } else {
        // Generate default username from address
        const defaultUsername = account?.slice(-8) || "user";
        setUsername(defaultUsername);
      }
    }
  }, [account]);

  const handleSaveUsername = async () => {
    if (!username?.trim() || !account) return;
    const trimmed = username.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!trimmed) {
      toast.error("Only letters and numbers allowed");
      return;
    }
    try {
      await updateUsername(account, trimmed);
      setUsername(trimmed);
      setIsEditingUsername(false);
      toast.success("Username saved!");
      window.dispatchEvent(new Event("payment-links-updated"));
    } catch (error) {
      if (error.message?.includes("already taken")) toast.error("Username already taken");
      else toast.error(error.message || "Failed to save username");
    }
  };

  const onCopy = () => {
    let copyText;
    if (mode === "username" && username) {
      copyText = `${username}${PAYMENT_LINK_SUFFIX}`;
    } else if (account) {
      copyText = account;
    } else {
      toast.error("Address not available", {
        duration: 1000,
        position: "bottom-center",
      });
      return;
    }

    navigator.clipboard.writeText(copyText);
    toast.success("Copied to clipboard", {
      duration: 1000,
      position: "bottom-center",
    });
  };

  if (!isConnected) {
    return (
      <div className="bg-primary-600 p-4 rounded-3xl text-white w-full">
        <div className="w-full flex items-center justify-between">
          <p className="text-xl">Receive</p>
        </div>
        <div className="bg-white rounded-full w-full h-14 mt-4 flex items-center justify-center text-gray-500">
          Connect wallet to receive payments
        </div>
      </div>
    );
  }

  return (
    <div className="bg-primary-600 p-4 rounded-3xl text-white w-full">
      <div className="w-full flex items-center justify-between">
        <p className="text-xl">Receive</p>
        <div className="bg-white rounded-full flex relative items-center font-medium px-1 py-1">
          <div
            className={cnm(
              "w-28 h-10 bg-primary-500 absolute left-1 rounded-full transition-transform ease-in-out",
              mode === "username" ? "translate-x-0" : "translate-x-full"
            )}
          ></div>
          <button
            onClick={() => setMode("username")}
            className={cnm(
              "w-28 h-10 rounded-full flex items-center justify-center relative transition-colors text-xs",
              mode === "username" ? "text-white" : "text-primary"
            )}
          >
            Username
          </button>
          <button
            onClick={() => setMode("address")}
            className={cnm(
              "w-28 h-8 rounded-full flex items-center justify-center relative transition-colors text-xs",
              mode === "address" ? "text-white" : "text-primary"
            )}
          >
            Address
          </button>
        </div>
      </div>

      {isEditingUsername ? (
        <div className="bg-white rounded-full w-full h-14 mt-4 flex items-center justify-between pl-4 pr-2 text-black">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
            placeholder="username"
            className="flex-1 bg-transparent outline-none text-sm"
            maxLength={20}
          />
          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveUsername}
              className="bg-green-500 text-white px-3 py-1 rounded-full text-xs font-medium"
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingUsername(false)}
              className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-xs font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-full w-full h-14 mt-4 flex items-center justify-between pl-6 pr-2 text-black">
          {mode === "address" ? (
            <div className="flex items-center gap-2">
               <p className="text-sm">
                 {account?.slice(0, 10)}...{account?.slice(-8)}
               </p>
               {ensName && (
                  <Chip variant="flat" color="primary" size="sm" startContent={<Globe size={10} />} className="h-6 text-[10px] font-bold">
                    ENS
                  </Chip>
               )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
               <p className="text-sm">{username}{PAYMENT_LINK_SUFFIX}</p>
               {ensName && (
                  <button 
                    onClick={() => {
                        toast.success(`Verified ENS: ${ensName}`);
                    }}
                    className="flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold border border-primary/20"
                  >
                    <Globe className="size-3" />
                    VERIFIED
                  </button>
               )}
            </div>
          )}
          <div className="flex items-center gap-2">
            {mode === "username" && (
              <button
                onClick={() => setIsEditingUsername(true)}
                className="bg-primary-50 size-9 rounded-full flex items-center justify-center"
              >
                <Icons.edit className="text-primary size-4" />
              </button>
            )}
            <button
              onClick={() => setOpenQr(true)}
              className="bg-primary-50 size-9 rounded-full flex items-center justify-center"
            >
              <QrCodeIcon className="size-5" />
            </button>
            <button
              onClick={onCopy}
              className="bg-primary-50 size-9 rounded-full flex items-center justify-center"
            >
              <CopyIcon className="size-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function MergedBalanceCard({ balance, isLoading, selectedCurrency, setSelectedCurrency }) {
  const navigate = useNavigate();

  const currentBalance = selectedCurrency === "ETH" 
    ? balance.eth 
    : (selectedCurrency === "USDC" ? balance.usdc : balance.bitgo);

  const getNetworkLabel = () => {
    if (selectedCurrency === "BITGO") return `BitGo Shielded (${import.meta.env.VITE_BITGO_ASSET_SYMBOL || 'tBaseETH'})`;
    return "Base Testnet";
  };

  return (
    <div className="w-full rounded-3xl bg-gradient-to-br from-white to-primary-50/30 border border-neutral-200 shadow-sm overflow-hidden relative">
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none overflow-hidden">
        <img
          src="/assets/radar-bg.png"
          alt="radar background"
          className="w-full h-full object-cover"
          style={{ transform: 'scale(1.2)' }}
        />
      </div>

      <div className="relative z-10">
        <div className="w-full px-6 pt-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="font-medium text-lg text-gray-700 mb-1">{getNetworkLabel()}</p>
              <p className="text-xs text-gray-500">
                {selectedCurrency === "BITGO" ? "BitGo Multi-Sig Vault" : "Held in private treasury"}
              </p>
            </div>
            
            {/* Currency Selector with token/company logos */}
            <div className="flex bg-gray-100 p-1 rounded-full border border-gray-200">
              <button
                onClick={() => setSelectedCurrency("ETH")}
                className={cnm(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  selectedCurrency === "ETH" ? "bg-white text-primary shadow-sm" : "text-gray-500"
                )}
              >
                <img src={ETH_LOGO} alt="ETH" className="size-5 rounded-full object-contain shrink-0" />
                ETH
              </button>
              <button
                onClick={() => setSelectedCurrency("USDC")}
                className={cnm(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  selectedCurrency === "USDC" ? "bg-white text-primary shadow-sm" : "text-gray-500"
                )}
              >
                <img src={USDC_LOGO} alt="USDC" className="size-5 rounded-full object-contain shrink-0" />
                USDC
              </button>
              <button
                onClick={() => setSelectedCurrency("BITGO")}
                className={cnm(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
                  selectedCurrency === "BITGO" ? "bg-white text-primary shadow-sm" : "text-gray-500"
                )}
              >
                <img src={BITGO_LOGO} alt="BitGo" className="size-5 rounded-full object-contain shrink-0" />
                BitGo
              </button>
            </div>
          </div>

          {isLoading ? (
            <Skeleton className="w-32 h-12 rounded-lg" />
          ) : (
            <div className="flex items-baseline gap-2 mb-2">
              <p className="text-4xl font-bold text-primary">
                {selectedCurrency === "USDC" ? currentBalance.toFixed(2) : currentBalance.toFixed(4)}
              </p>
              <p className="text-lg font-semibold text-gray-600">
                {selectedCurrency === "BITGO" ? (import.meta.env.VITE_BITGO_ASSET_SYMBOL || 'tBaseETH') : selectedCurrency}
              </p>
            </div>
          )}
        </div>

        <div className="w-full px-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-base text-gray-900 mb-0.5">Portfolio Balance</h2>
              <p className="text-xs text-gray-500">Last 7 days trend ({selectedCurrency})</p>
            </div>
          </div>
          <div className="w-full h-[280px] -mx-2">
            <BalanceChart balance={currentBalance} currency={selectedCurrency} />
          </div>
        </div>

        <div className="w-full px-6 pb-6 pt-2 flex flex-col items-center gap-2">
          <div className="w-full flex items-center gap-2">
            <Button
              onClick={() => navigate("/send")}
              className="flex-1 rounded-full h-12 bg-primary text-white font-semibold"
            >
              Send
            </Button>
            <Button
              onClick={() => navigate("/send#withdraw")}
              className="flex-1 rounded-full h-12 bg-primary-50 text-primary font-medium"
            >
              Withdraw
            </Button>
          </div>
          <Button
            onClick={() => navigate("/transactions")}
            className="w-full rounded-full h-12 bg-primary-50 text-primary font-medium"
          >
            History
          </Button>
        </div>
      </div>
    </div>
  );
}
