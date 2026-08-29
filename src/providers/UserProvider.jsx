import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "../hooks/use-session";
import { privatepayAPI } from "../api/privatepay";
import { useAuth } from "./AuthProvider";
import toast from "react-hot-toast";
import { useLocalStorage } from "@uidotdev/usehooks";
import { useListenEvent } from "../hooks/use-event";
import { useAppWallet } from "../hooks/useAppWallet";


const UserContext = createContext({
  assets: {},
  address: "",
  userData: {},
  refetchAssets: () => { },
  isAssetsLoading: false,
});

export default function UserProvider({ children }) {
  const { isSignedIn } = useSession();
  const { userData } = useAuth();
  const [assets, setAssets] = useLocalStorage("user-assets", null);
  const [isAssetsLoading, setAssetsLoading] = useState(false);
  const [isAssetsRefetching, setAssetsRefetching] = useState(false);
  const { account: address } = useAppWallet();

  const handleFetchAssets = async () => {
    if (isAssetsLoading || !userData?.user?.username) {
      // Skip if no username (backend might be down or user not set up)
      console.warn("[UserProvider] Skipping asset fetch - no username available");
      return;
    }
    setAssetsLoading(true);
    try {
      console.log(`Fetching assets for ${userData.user.username}.privatepay.base`, {
        userData,
      });

      const res = await privatepayAPI.get(
        `/user/wallet-assets/${userData.user.username}/all-assets`
      );

      setAssets(res.data);
    } catch (error) {
      // If backend is not available, don't show error toast
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
        console.warn("[UserProvider] Backend not available, skipping asset fetch");
      } else {
        console.error("Error fetching user assets", error);
        toast.error("Error fetching user assets");
      }
    } finally {
      setAssetsLoading(false);
    }
  };

  const refetchAssets = async () => {
    if (isAssetsRefetching || !userData?.user?.username) {
      // Skip if no username (backend might be down or user not set up)
      console.warn("[UserProvider] Skipping asset refetch - no username available");
      return;
    }
    setAssetsRefetching(true);
    try {
      console.log(`Fetching assets for ${userData.user.username}.privatepay.base`, {
        userData,
      });

      const res = await privatepayAPI.get(
        `/user/wallet-assets/${userData.user.username}/all-assets`
      );

      setAssets(res.data);
    } catch (error) {
      // If backend is not available, don't show error toast
      if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
        console.warn("[UserProvider] Backend not available, skipping asset refetch");
      } else {
        console.error("Error fetching user assets", error);
        toast.error("Error fetching user assets");
      }
    } finally {
      setAssetsRefetching(false);
    }
  };

  useListenEvent("create-link-dialog", () => {
    refetchAssets();
  });

  useEffect(() => {
    if (isSignedIn && userData && userData?.username) {
      // Fetch assets every 10 seconds
      handleFetchAssets();

      const interval = setInterval(() => {
        // handleFetchAssets();
      }, 5_000);

      return () => {
        clearInterval(interval);
      };
    }
  }, [isSignedIn, userData]);

  return (
    <UserContext.Provider
      value={{
        assets: assets,
        userData: userData,
        refetchAssets: refetchAssets,
        isAssetsLoading,
        address,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  return useContext(UserContext);
};
