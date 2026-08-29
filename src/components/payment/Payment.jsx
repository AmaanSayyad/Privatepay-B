import { Button, Input, Spinner } from "@nextui-org/react";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useLoaderData, useParams } from "react-router-dom";
import { useAppWallet } from "../../hooks/useAppWallet.js";
import { getPaymentLinkByAlias, getUserByUsername, recordPayment } from "../../lib/supabase.js";
import { ethers } from "ethers";
import { BASE_LOGO, ETH_LOGO, USDC_LOGO, USDC_ADDRESS, baseSepolia, BASE_TREASURY_ADDRESS } from "../../config.js";

const USDC_ABI = [
  "function transfer(address to, uint256 amount) public returns (bool)",
  "function decimals() public view returns (uint8)"
];

import SuccessDialog from "../dialogs/SuccessDialog.jsx";
// Wallet connect via ConnectKit (Base + mainnet for ENS)

export default function Payment() {
  const loaderData = useLoaderData();
  const { alias_url } = useParams();
  const { account, isConnected, connect, signer, provider } = useAppWallet();


  const alias = loaderData ? loaderData.subdomain : alias_url;

  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [paymentLinkData, setPaymentLinkData] = useState(null);
  const [recipientData, setRecipientData] = useState(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("ETH");
  const [openSuccess, setOpenSuccess] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchPaymentLink() {
      if (!alias) {
        setError("No payment link alias provided");
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const paymentLink = await getPaymentLinkByAlias(alias);

        if (paymentLink) {
          setPaymentLinkData(paymentLink);
          const recipient = await getUserByUsername(paymentLink.username);
          setRecipientData(recipient);
        } else {
          const recipient = await getUserByUsername(alias);
          if (recipient) {
            setRecipientData(recipient);
          } else {
            setError("Payment link not found. Please check the URL and try again.");
          }
        }
      } catch (err) {
        console.error("Error fetching payment link:", err);
        setError("Failed to load payment link. Please try again.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchPaymentLink();
  }, [alias]);

  const handleSendPayment = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    if (!isConnected || !account || !signer) {
      toast.error("Please connect your wallet first");
      return;
    }


    const recipientUsername = paymentLinkData?.username || alias;

    if (!recipientUsername) {
      toast.error("Recipient not found");
      return;
    }

    // All payments go to the single treasury
    setIsSending(true);
    try {
      const treasuryAddress = BASE_TREASURY_ADDRESS;
      if (!treasuryAddress) throw new Error("Treasury address not configured");

      let tx;
      if (currency === 'ETH') {
        tx = await signer.sendTransaction({
          to: treasuryAddress,
          value: ethers.parseEther(amount.toString()),
        });
      } else {
        const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, signer);
        const decimals = 6;
        const amountWei = ethers.parseUnits(amount.toString(), decimals);
        tx = await usdcContract.transfer(treasuryAddress, amountWei);
      }

      const receipt = await tx.wait();

      if (!receipt || receipt.status === 0) {
        throw new Error("Transaction failed on-chain");
      }

      await recordPayment(
        account,
        recipientUsername,
        parseFloat(amount),
        tx.hash,
        { currency }
      );

      window.dispatchEvent(new Event("balance-updated"));
      window.dispatchEvent(new Event("transactions-updated"));

      const shortHash = tx.hash
        ? `${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`
        : "";

      toast.success(
        (t) => (
          <div
            onClick={() => {
              const explorer = baseSepolia.blockExplorers.default.url;
              if (explorer) window.open(`${explorer}/tx/${tx.hash}`, "_blank");
              toast.dismiss(t.id);
            }}
            className="cursor-pointer hover:underline"
          >
            Payment sent to {alias}.privatepay.base! TX: {shortHash} (click to view)
          </div>
        ),
        { duration: 8000 }
      );

      const successDataObj = {
        type: "PRIVATE_TRANSFER",
        amount: parseFloat(amount),
        chain: { name: "Base Sepolia", id: "base-sepolia" },
        token: {
          nativeToken: {
            symbol: currency,
            logo: currency === 'USDC' ? USDC_LOGO : ETH_LOGO,
          },
        },
        destinationAddress: `${alias}.privatepay.base`,
        txHashes: [tx.hash],
      };
      setSuccessData(successDataObj);
      setOpenSuccess(true);
      setAmount("");
    } catch (err) {
      const code = err?.code ?? err?.info?.error?.code;
      const msg = (err?.message || '').toLowerCase();
      if (code === 4001 || code === 'ACTION_REJECTED' || msg.includes('rejected') || msg.includes('denied')) {
        toast.error('Transaction cancelled. Click Confirm in your wallet to send.');
      } else {
        console.error("Payment error:", err);
        toast.error(err.message || "Failed to send payment");
      }
    } finally {
      setIsSending(false);
    }

  };

  return (
    <>
      <SuccessDialog
        open={openSuccess}
        setOpen={setOpenSuccess}
        botButtonHandler={() => setOpenSuccess(false)}
        botButtonTitle="Done"
        successData={successData}
      />

      <div className="flex flex-col w-full max-w-md h-full max-h-screen items-center justify-center gap-5">
        <div className="w-28 h-10 flex items-center justify-center">
          <img
            src={BASE_LOGO}
            alt="Base"
            className="h-10 w-auto object-contain rounded-full"
          />
        </div>

        <div className="w-full h-full flex items-center justify-center">
          {isLoading && (
            <div className="my-10 flex flex-col items-center">
              <Spinner color="primary" size="lg" />
              <div className="mt-5 animate-pulse text-gray-600">Loading payment link...</div>
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center max-w-[20rem] bg-red-50 border border-red-200 rounded-2xl p-6">
              <p className="text-red-800 font-medium">{error}</p>
              <p className="text-red-600 text-sm mt-2">Please check the link and try again.</p>
            </div>
          )}

          {!isLoading && !error && (paymentLinkData || recipientData) && (
            <div className="bg-white rounded-[32px] py-9 px-10 md:px-20 flex flex-col items-center justify-center w-full border border-gray-200 shadow-lg">
              <h1 className="font-athletics font-medium text-xl mb-2 text-center">
                Send to{" "}
                <span className="font-semibold text-primary">{alias}</span>
              </h1>

              <p className="text-sm text-gray-500 mb-6 font-mono">
                {alias}.privatepay.base
                {paymentLinkData?.username && paymentLinkData.username !== alias && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({paymentLinkData.username})
                  </span>
                )}
              </p>

              {!isConnected ? (
                <div className="w-full flex flex-col gap-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
                    <p className="text-sm text-blue-800 text-center">
                      Connect your wallet to send a payment
                    </p>
                  </div>
                  <div className="flex justify-center">
                    <Button
                      onClick={connect}
                      className="bg-primary text-white font-bold py-5 px-6 h-16 w-full rounded-[32px]"
                    >
                      Connect Wallet
                    </Button>
                  </div>

                </div>
              ) : (
                <div className="w-full flex flex-col gap-4">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-green-800 font-medium">Wallet Connected</p>
                        <p className="text-xs text-green-600 mt-1">
                          {account?.slice(0, 10)}...{account?.slice(-8)}
                        </p>
                      </div>
                      <svg className="text-green-600 w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex gap-2 mb-2 p-1 bg-gray-100 rounded-2xl w-full">
                    <button
                      onClick={() => setCurrency('ETH')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${currency === 'ETH' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <img src={ETH_LOGO} alt="" className="size-5 rounded-full object-contain shrink-0" />
                      ETH
                    </button>
                    <button
                      onClick={() => setCurrency('USDC')}
                      className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${currency === 'USDC' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      <img src={USDC_LOGO} alt="" className="size-5 rounded-full object-contain shrink-0" />
                      USDC
                    </button>
                  </div>

                  <Input
                    label={`Amount (${currency})`}
                    type="number"
                    placeholder="0.1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    description="Enter the amount you want to send"
                    classNames={{ input: "text-lg", inputWrapper: "h-14" }}
                    min="0"
                    step="0.001"
                  />

                  <Button
                    onClick={handleSendPayment}
                    isLoading={isSending}
                    disabled={!amount || parseFloat(amount) <= 0}
                    className="bg-primary text-white font-bold py-5 px-6 h-16 w-full rounded-[32px]"
                    size="lg"
                  >
                    {isSending ? "Sending..." : `Send ${amount?.trim() || "0"} ${currency}`}
                  </Button>

                  <p className="text-xs text-gray-500 text-center mt-2">
                    Funds go to the treasury. The recipient is credited in-app and can withdraw their amount from the app.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
