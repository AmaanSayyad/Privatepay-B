import { Button } from "@nextui-org/react";
import { Link } from "react-router-dom";
import { Icons } from "./Icons.jsx";
import { useSetAtom } from "jotai";
import { isCreateLinkDialogAtom } from "../../store/dialog-store.js";
import { useAppWallet } from "../../hooks/useAppWallet.js";
import { useModal } from "connectkit";
import { useState } from "react";
import toast from "react-hot-toast";
import { APP_LOGO, BASE_LOGO, BITGO_LOGO, baseSepolia } from "../../config.js";
import { useEnsProfile } from "../../hooks/useEnsProfile.js";
import { Globe } from "lucide-react";

export default function Header() {
  const setCreateLinkModal = useSetAtom(isCreateLinkDialogAtom);

  return (
    <nav className="fixed top-0 z-50 flex items-center px-5 md:px-12 h-20 justify-between bg-white md:bg-transparent w-full">
      <div className="flex flex-row items-center gap-12">
        <Link to={"/"} className="flex items-center gap-2 min-w-[7rem]">
          <img
            src={APP_LOGO}
            alt="Private-Pay"
            className="h-8 w-auto object-contain"
          />
          <h1 className="font-bold text-xl text-gray-900">Private-Pay</h1>
        </Link>
      </div>

      <div className="flex gap-4 items-center justify-center">
        <Button
          onClick={() => setCreateLinkModal(true)}
          className={"bg-primary h-12 rounded-[24px] px-4"}
        >
          <Icons.link className="text-white" />
          <h1 className="font-athletics text-sm font-medium text-white">Create Link</h1>
        </Button>

        <UserProfileButton />
      </div>
    </nav>
  );
}

const UserProfileButton = () => {
  const { account, isConnected, connect, disconnect } = useAppWallet();
  const { name: ensName, avatar: ensAvatar } = useEnsProfile(account);
  const { setOpen } = useModal();
  const [showMenu, setShowMenu] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      toast.error(error.message || "Failed to connect wallet");
    }
  };


  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowMenu(false);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  if (!isConnected) {
    return (
      <Button
        onClick={() => setOpen(true)}
        className="h-12 rounded-full bg-primary-50 text-primary font-medium px-6"
      >
        Connect Wallet
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="size-12 rounded-full overflow-hidden relative border-2 border-primary/30 bg-primary-50 flex items-center justify-center p-0.5"
      >
        {ensAvatar ? (
          <img src={ensAvatar} alt="ENS Avatar" className="w-full h-full object-cover rounded-full" />
        ) : (
          <img src="/assets/nouns.png" alt="Wallet" className="w-full h-full object-contain" />
        )}
        {ensName && (
           <div className="absolute bottom-0 right-0 bg-primary rounded-full p-0.5 border border-white">
              <Globe className="size-2 text-white" />
           </div>
        )}
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-14 z-50 bg-white rounded-2xl shadow-lg border border-neutral-200 p-4 min-w-[280px]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-200">
                <div className="size-10 rounded-full overflow-hidden border-2 border-primary flex-shrink-0 bg-primary-50 flex items-center justify-center p-0.5">
                  {ensAvatar ? (
                    <img src={ensAvatar} alt="ENS Avatar" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <img src="/assets/nouns.png" alt="Wallet" className="w-full h-full object-contain" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-800 truncate">
                    {ensName || `${account?.slice(0, 6)}...${account?.slice(-4)}`}
                  </p>
                  {ensName && (
                    <p className="text-[10px] text-primary font-medium truncate italic mt-0.5">
                      {account?.slice(0, 10)}... ENS Linked
                    </p>
                  )}
                  <p className="text-[10px] text-gray-500">Base Sepolia</p>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(account || "");
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <Icons.copy className="size-4 text-gray-600" />
                <span className="text-sm text-gray-700">Copy Address</span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    `${baseSepolia.blockExplorers.default.url}/address/${account}`,
                    "_blank"
                  );
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <Icons.externalLink className="size-4 text-gray-600" />
                <span className="text-sm text-gray-700">View on Explorer</span>
              </button>

              <div className="border-t border-neutral-200 pt-2">
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors w-full text-red-600"
                >
                  <Icons.logout className="size-4" />
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
