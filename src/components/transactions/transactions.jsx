import TxItem from "../alias/TxItem.jsx";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { shortenId } from "../../utils/formatting-utils.js";
import { Spinner } from "@nextui-org/react";
import { useAppWallet } from "../../hooks/useAppWallet.js";
import { getPaymentsByWallet, getUserByWallet } from "../../lib/supabase.js";
import { USDC_LOGO, ETH_LOGO, BITGO_LOGO } from "../../config.js";

function getTokenImg(currency) {
  const c = (currency || "").toUpperCase();
  if (c === "USDC") return USDC_LOGO;
  if (c === "BITGO_TETH" || c === "BITGO") return BITGO_LOGO;
  return ETH_LOGO;
}

function getCurrencyLabel(currency) {
  const c = (currency || "ETH").toUpperCase();
  if (c === "BITGO_TETH") return import.meta.env.VITE_BITGO_ASSET_SYMBOL || "tBaseETH";
  return c;
}

export default function Transactions() {
  const { account } = useAppWallet();
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");

  const loadTransactions = async () => {
    if (!account) {
      setIsLoading(false);
      return;
    }

    try {
      const savedUsername = localStorage.getItem(`base_username_${account}`) || account?.slice(-8) || "";
      const user = await getUserByWallet(account);
      const displayUsername = user?.username ?? savedUsername ?? "";
      setUsername(displayUsername);

      const payments = await getPaymentsByWallet(account, displayUsername);
      setTransactions(payments);
    } catch (error) {
      console.error("Error loading transactions:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTransactions();

    const onUpdate = () => loadTransactions();
    window.addEventListener("transactions-updated", onUpdate);

    const interval = setInterval(loadTransactions, 10000);

    return () => {
      window.removeEventListener("transactions-updated", onUpdate);
      clearInterval(interval);
    };
  }, [account]);

  const groupedTransactions = useMemo(() => {
    return transactions?.reduce((acc, tx) => {
      const dateKey = format(new Date(tx.created_at), "MM/dd/yyyy");
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(tx);
      return acc;
    }, {});
  }, [transactions]);

  return (
    <div className={"relative flex h-full w-full"}>
      {isLoading ? (
        <Spinner
          size="md"
          color="primary"
          className="flex items-center justify-center w-full h-40"
        />
      ) : transactions && transactions.length > 0 ? (
        <div className="flex flex-col w-full">
          {Object.keys(groupedTransactions).map((date) => (
            <div key={date} className="mb-4">
              <p className="text-[#A1A1A3] font-medium text-sm mt-1">{date}</p>
              {groupedTransactions[date].map((tx, idx) => {
                const isWithdrawal = tx.status === 'withdrawn';
                const isSent = tx.is_sent === true;
                const isReceived = !isWithdrawal && !isSent;

                let title, subtitle, value;

                const currency = tx.currency || tx.metadata?.currency || "ETH";
                const currencyLabel = getCurrencyLabel(currency);
                const decimals = currency === "USDC" ? 2 : 4;

                if (isWithdrawal) {
                  title = "Withdrawal";
                  subtitle = "to your wallet";
                  value = `-${Math.abs(tx.amount).toFixed(decimals)} ${currencyLabel}`;
                } else if (isSent) {
                  title = "Sent Payment";
                  subtitle = `to ${tx.recipient_username}.privatepay.base`;
                  value = `-${Math.abs(tx.amount).toFixed(decimals)} ${currencyLabel}`;
                } else {
                  title = `${username}.privatepay.base`;
                  subtitle = `Private Sender`;
                  value = `+${Math.abs(tx.amount).toFixed(decimals)} ${currencyLabel}`;
                }

                return (
                  <TxItem
                    key={idx}
                    isNounsies={false}
                    tokenImg={getTokenImg(currency)}
                    title={title}
                    subtitle={subtitle}
                    value={value}
                    subValue={tx.tx_hash ? shortenId(tx.tx_hash) : ''}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full flex flex-col items-center justify-center min-h-64 gap-2">
          <p className="text-gray-600">No transactions found</p>
          <p className="text-sm text-gray-400">
            Transactions will appear here when you receive or send ETH/USDC
          </p>
        </div>
      )}
    </div>
  );
}
