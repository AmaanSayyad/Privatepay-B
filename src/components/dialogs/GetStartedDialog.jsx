import {
  Modal,
  ModalContent,
  Button,
  Input,
  Skeleton,
} from "@nextui-org/react";
import { useEffect, useState } from "react";
import Confetti from "react-dom-confetti";
import { APP_LOGO } from "../../config.js";

import { useAtom } from "jotai";
import { isGetStartedDialogAtom } from "../../store/dialog-store";
import toast from "react-hot-toast";
import { privatepayAPI } from "../../api/privatepay";
import { useAppWallet } from "../../hooks/useAppWallet.js";
import Nounsies from "../shared/Nounsies";
import useSWR, { mutate } from "swr";
import { useNavigate } from "react-router-dom";
import { useDebounce } from "@uidotdev/usehooks";
import { ethers } from "ethers";

const confettiConfig = {
  angle: 90,
  spread: 300,
  startVelocity: 20,
  elementCount: 60,
  dragFriction: 0.1,
  duration: 3000,
  stagger: 3,
  width: "8px",
  height: "8px",
  perspective: "500px",
};

export default function GetStartedDialog() {
  const [isOpen, setOpen] = useAtom(isGetStartedDialogAtom);

  const [step, setStep] = useState("one");

  const handleClose = () => {
    // Mark that user has skipped username setup
    localStorage.setItem("username_setup_skipped", "true");
    setOpen(false);
  };

  return (
    <Modal
      isOpen={isOpen}
      isDismissable={true}
      isKeyboardDismissDisabled={false}
      hideCloseButton={false}
      onClose={handleClose}
      placement="center"
    >
      <ModalContent className="bg-white rounded-4xl p-8 max-w-[562px] flex flex-col items-start relative">
        {step === "one" ? (
          <StepOne setStep={setStep} setOpen={setOpen} />
        ) : (
          <StepTwo setOpen={setOpen} />
        )}
      </ModalContent>
    </Modal>
  );
}

function StepOne({ setStep, setOpen }) {
  const [username, setUsername] = useState("");
  const [isUsernameAvailable, setIsUsernameAvailable] = useState(false);
  const [isCheckingUsername, setIsCheckingUsername] = useState(false);
  const debouncedUsername = useDebounce(username, 500);

  const handleCheckUsername = async () => {
    try {
      if (!debouncedUsername) {
        setIsUsernameAvailable(false);
        return;
      }

      setIsCheckingUsername(true);

      const { data } = await privatepayAPI.get(`/stealth-address/aliases/check`, {
        params: {
          alias: debouncedUsername,
        },
      });

      setIsUsernameAvailable(data)
    } catch (error) {
      // If backend is not available, allow username (skip validation)
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
        // Backend unavailable - allow username to proceed
        setIsUsernameAvailable(true);
      } else {
        // Other errors - don't allow username
        setIsUsernameAvailable(false);
      }
    } finally {
      setIsCheckingUsername(false);
    }
  };

  useEffect(() => {
    if (!debouncedUsername) {
      setIsUsernameAvailable(false);
      setIsCheckingUsername(false);
      return;
    } else {
      handleCheckUsername()
    }
  }, [debouncedUsername])

  const [loading, setLoading] = useState(false);



  async function handleUpdate() {
    console.log('handleUpdate')
    if (loading) return;

    if (!username) {
      return toast.error("Please provide a username");
    }

    setLoading(true);

    try {
      toast.loading(
        "Preparing meta address, please sign the transaction...",
        {
          id: 'loading-meta-address',
        }
      );

      let authSigner;
      try {
        const authSignerData = localStorage.getItem("auth_signer");
        if (!authSignerData) {
          throw new Error("Auth signer not found in localStorage");
        }
        // Validate JSON before parsing
        if (typeof authSignerData !== 'string' || !authSignerData.trim().startsWith('{')) {
          console.error("Invalid auth_signer data in localStorage");
          throw new Error("Invalid signer data. Please reconnect your wallet.");
        }
        authSigner = JSON.parse(authSignerData);
      } catch (error) {
        console.error("Failed to parse auth_signer:", error);
        throw error;
      }
      if (!authSigner) {
        throw new Error("Auth signer not found in localStorage");
      }

      // Register the username via the backend, falling back to local state.
      {
        toast.dismiss("loading-meta-address");
        try {
          await privatepayAPI.post("/user/update-user", {
            username: username.toLowerCase(),
          });
          await mutate("/auth/me");
          toast.success("Username created successfully");
          localStorage.removeItem("username_setup_skipped");
          setStep("two");
        } catch (err) {
          console.warn("[GetStartedDialog] Backend user update failed", err);
          toast.success("Username saved locally. Connect to backend to sync.");
          setStep("two");
        }
        setLoading(false);
        return;
      }

    } catch (e) {
      console.error('Error creating username', e)

      // Check for specific error types and provide helpful messages
      let errorMessage = "Error creating your username";
      let showDetailedError = false;

      // Check for insufficient balance errors
      const isInsufficientBalance =
        e?.message?.includes("insufficient balance") ||
        e?.message?.includes("insufficient balance to pay fees") ||
        e?.code === -32000 ||
        (e?.error?.message?.includes("insufficient balance"));

      if (isInsufficientBalance) {
        errorMessage = 'Insufficient balance to cover gas fees.';
      } else if (e?.message) {
        errorMessage = e.message;
      }

      // Only show generic error if we haven't shown a detailed one
      if (!showDetailedError) {
        toast.error(errorMessage, {
          id: 'loading-meta-address',
          duration: 8000,
        });
      }
    } finally {
      toast.dismiss('loading-meta-address');
      setLoading(false);
    }
  }

  return (
    <>
      <p className="text-2xl font-semibold">Let's get started!</p>
      <p className="text-lg mt-4">
        Pick a cool username for your Private-Pay. This will be your payment link, so anyone can easily send you money
      </p>
      <div className="mt-8 rounded-xl size-24 aspect-square bg-neutral-100 overflow-hidden mx-auto">
        <img
          src="/assets/nouns-placeholder.png"
          alt="nouns-placeholder"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="mt-8 w-full flex items-center relative">
        <Input
          className="w-full"
          type="text"
          classNames={{
            mainWrapper: "rounded-2xl",
            inputWrapper: "h-16",
            input:
              "focus-visible:outline-primary text-base placeholder:text-neutral-300",
          }}
          value={username}
          onChange={(e) => {
            const val = e.target.value;
            setUsername(val);
          }}
          placeholder="your-username"
          variant="bordered"
          isInvalid={!isUsernameAvailable && username}
        />
        <p className="absolute right-4 text-neutral-400">.privatepay.bot</p>
      </div>
      {(isUsernameAvailable === false && username) &&
        <div className="text-red-500 mt-1">
          Username is already taken
        </div>
      }
      <div className="w-full mt-4 flex flex-col gap-3">
        <Button
          onClick={handleUpdate}
          loading={loading || isCheckingUsername}
          isDisabled={loading || !isUsernameAvailable || isCheckingUsername}
          className="h-16 rounded-full text-white flex items-center justify-center w-full bg-primary-600"
        >
          Continue
        </Button>
        <Button
          onClick={() => {
            // Mark that user has skipped username setup
            localStorage.setItem("username_setup_skipped", "true");
            setOpen(false);
            toast.success("You can set up your username later from your profile");
          }}
          variant="light"
          className="h-12 rounded-full text-gray-600 flex items-center justify-center w-full"
        >
          Skip for now
        </Button>
      </div>
    </>
  );
}

function StepTwo({ setOpen }) {
  const [confettiTrigger, setConfettiTrigger] = useState(false);
  const { account } = useAppWallet();
  const { data: user, isLoading } = useSWR("/auth/me", async (url) => {
    try {
      const { data } = await privatepayAPI.get(url);
      return data;
    } catch (error) {
      // If backend is not available, return fallback user data
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
        console.warn("[GetStartedDialog] Backend not available, using fallback user data");
        return {
          user: {
            address: account,
            username: null,
          },
        };
      }
      throw error;
    }
  }, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
    shouldRetryOnError: false,
    errorRetryCount: 0,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setConfettiTrigger((prev) => !prev);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <p className="text-2xl font-semibold">You're all set!</p>
      <p className="text-lg mt-4">
        Your Private-Pay username is live and ready for action. Share it with anyone
        to start receiving payments like a pro
      </p>
      {/* Card */}
      <div className="w-full rounded-2xl bg-primary-600 h-[221px] mt-5 flex flex-col overflow-hidden relative">
        <div className="w-full flex items-center justify-end px-6 py-5 text-white">
          {isLoading ? (
            <Skeleton className="w-24 h-8 rounded-md" />
          ) : (
            <p className="text-xl">{user?.username || 'user'}.privatepay.bot</p>
          )}
        </div>
        <div className="bg-primary-50 flex-1 flex flex-col justify-end">
          <div className="w-full flex items-end justify-between py-5 px-6">
            <p className="text-primary-600 text-2xl font-medium">PRIVATE-PAY</p>
            <img src={APP_LOGO} alt="Private-Pay" className="w-10 h-auto object-contain" />

          </div>
        </div>
        {/* Image */}
        <div className="absolute size-24 top-6 left-6 rounded-xl bg-neutral-200 overflow-hidden">
          <Nounsies address={account} />
        </div>
      </div>

      <Button
        onClick={async () => {
          await navigator.share({
            title: "Link",
            text: `${user?.username || 'user'}.privatepay.bot`,
          });
        }}
        className="h-16 rounded-full text-white flex items-center justify-center w-full mt-4 bg-primary-600"
      >
        Start Sharing
      </Button>
      <Button
        onClick={async () => {
          // Refresh user data before closing
          await mutate("/auth/me");
          setOpen(false);
          navigate("/");
        }}
        className="h-16 rounded-full bg-transparent flex items-center justify-center w-full mt-1 text-primary-600"
      >
        Go to dashboard
      </Button>
      <div className="absolute inset-0 overflow-hidden flex flex-col items-center mx-auto pointer-events-none">
        <Confetti
          active={confettiTrigger}
          config={confettiConfig}
          className="-translate-y-[4rem] translate-x-[0.4rem]"
        />
      </div>
    </>
  );
}
