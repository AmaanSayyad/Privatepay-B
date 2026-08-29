import { createContext, useContext, useEffect, useState } from "react";
import { privatepayAPI, privatepayPublicAPI } from "../api/privatepay";
import { isGetStartedDialogAtom } from "../store/dialog-store";
import { useAtom } from "jotai";
import { signAuthToken } from "../lib/ethers";
import { isSignedInAtom } from "../store/auth-store";
import { useSession } from "../hooks/use-session";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import useSWR from "swr";
import { useAppWallet } from "../hooks/useAppWallet";

const AuthContext = createContext({
  userData: {},
});

export default function AuthProvider({ children }) {
  const { account, isConnected } = useAppWallet();
  const [, setOpen] = useAtom(isGetStartedDialogAtom);
  const { isSignedIn, isLoading } = useSession();

  const { data: userData, mutate } = useSWR(
    isSignedIn && account ? `user-${account}` : null,
    async () => {
      try {
        const { getUserByWallet } = await import("../lib/supabase.js");
        const dbUser = await getUserByWallet(account);

        return {
          user: {
            address: account,
            username: dbUser?.username || null,
          }
        };
      } catch (error) {
        console.error("Error fetching user from Supabase:", error);
        return {
          user: {
            address: account,
            username: null,
          }
        };
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      shouldRetryOnError: false,
      errorRetryCount: 0,
    }
  );

  useEffect(() => {
    // If we've successfully got userData but the user has no username
    // and hasn't explicitly skipped setting one up, ask them to pick a username
    if (userData && isConnected) {
      const username = userData.user?.username || userData.username;
      const hasSkipped = localStorage.getItem("username_setup_skipped") === "true";

      if ((username === "" || !username) && !hasSkipped) {
        const timer = setTimeout(() => {
          setOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        setOpen(false);
      }
    }
  }, [userData, isConnected, setOpen]);

  // Make sure we revalidate immediately upon connect
  useEffect(() => {
    if (isConnected && account) mutate();
  }, [isConnected, account]);

  return (
    <AuthContext.Provider
      value={{
        userData: userData || {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
