import { Modal, ModalContent } from "@nextui-org/react";
import { useEffect, useState } from "react";

export default function OnRampDialog({
  open,
  setOpen,
  targetWallet,
  onSuccessOnramp,
}) {
  const [counter, setCounter] = useState(0);
  const [orderStatus, setOrderStatus] = useState("Pending");

  // Simulate API call
  const checkOrderStatus = () => {
    console.log("Checking order status...");
  };

  useEffect(() => {
    if (counter >= 60) {
      setOpen(false);
      onSuccessOnramp();
    }
  }, [counter]);

  useEffect(() => {
    let secondTimer, apiTimer;

    if (open) {
      // Reset counter and status when modal opens
      setCounter(0);
      setOrderStatus("Pending");

      // Increment counter every second
      secondTimer = setInterval(() => {
        setCounter((prev) => prev + 1);
      }, 1000);

      // Check order status (call API) every 5 seconds
      apiTimer = setInterval(() => {
        checkOrderStatus();
      }, 5000);
    }

    // Cleanup both timers when modal closes
    return () => {
      clearInterval(secondTimer);
      clearInterval(apiTimer);
    };
  }, [open]);
  return (
    <Modal
      isOpen={open}
      onOpenChange={setOpen}
      size="lg"
      placement="center"
      hideCloseButton
    >
      <ModalContent className="flex flex-col w-full h-full max-h-[70vh] p-6">
        <div className="flex flex-col gap-4 items-center justify-center text-center min-h-[200px]">
          <p className="text-gray-700 font-medium">Get ETH on Base Sepolia</p>
          <p className="text-sm text-gray-500">Use the faucet to receive testnet ETH for your wallet.</p>
          <a
            href="https://sepolia-faucet.pk910.de/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary font-semibold underline"
          >
            Base Sepolia Faucet →
          </a>
          {targetWallet && (
            <p className="text-xs text-gray-400 font-mono break-all">Wallet: {targetWallet}</p>
          )}
        </div>
      </ModalContent>
    </Modal>
  );
}
