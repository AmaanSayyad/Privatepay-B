import { useEffect, useState } from "react";
import { isSignedInAtom } from "../store/auth-store";
import { useAtom } from "jotai";
import Cookies from "js-cookie";
import { useAccount } from "wagmi";

export const useSession = () => {
  const { isConnected: isLoggedIn } = useAccount();
  const [isSignedIn, setSignedIn] = useAtom(isSignedInAtom);
  const [isLoading, setIsLoading] = useState(false);
  const access_token = Cookies.get("access_token");

  // Log session state for debugging
  console.log("[useSession] Session state:", {
    isLoggedIn,
    isSignedIn,
    hasAccessToken: !!access_token,
    hasAuthSigner: !!localStorage.getItem("auth_signer"),
  });

  useEffect(() => {
    let timeout;

    // As long as wagmi is connected, mark as signed in.
    if (isLoggedIn) {
      setIsLoading(true);
      setSignedIn(true);
      timeout = setTimeout(() => {
        setIsLoading(false);
      }, 500);
    } else {
      setSignedIn(false);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isLoggedIn, setSignedIn]);

  return {
    isSignedIn,
    isLoading,
  };
};
