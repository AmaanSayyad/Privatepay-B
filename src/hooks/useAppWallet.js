/**
 * App wallet hook — Updated for Base (EVM) via Wagmi and ConnectKit (Family Adapter).
 * Exposes { account, isConnected, connect, disconnect, provider, signer }
 */
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useAccount, useDisconnect, useWalletClient } from "wagmi";
import { useModal } from "connectkit";
import { useMemo, useEffect } from "react";

// Convert viem WalletClient to ethers.js Signer (v6)
export function clientToSigner(client) {
  const { account, chain, transport } = client;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain?.contracts?.ensRegistry?.address,
  };
  const provider = new BrowserProvider(transport, network);
  const signer = new JsonRpcSigner(provider, account.address);
  return signer;
}

export function useAppWallet() {
  const { address, isConnected, connector } = useAccount();
  const { setOpen } = useModal();
  const { disconnect } = useDisconnect();
  const { data: walletClient } = useWalletClient();

  // Create an ethers signer when the wallet client is available
  const signer = useMemo(() => {
    console.log("[useAppWallet] recalculating signer. walletClient:", !!walletClient);
    if (walletClient) {
      try {
        return clientToSigner(walletClient);
      } catch (e) {
        console.error("[useAppWallet] error creating signer:", e);
      }
    }
    // Fallback if wagmi hasn't yielded client but we have connection
    if (address && window.ethereum) {
      try {
        console.log("[useAppWallet] Falling back to window.ethereum...");
        const provider = new BrowserProvider(window.ethereum);
        return new JsonRpcSigner(provider, address);
      } catch (e) {
        console.error("[useAppWallet] fallback error:", e);
      }
    }
    return null;
  }, [walletClient, address]);

  // Close ConnectKit modal when already connected (avoids stuck WalletConnect QR / 403)
  useEffect(() => {
    if (isConnected) setOpen(false);
  }, [isConnected, setOpen]);

  useEffect(() => {
    console.log("[useAppWallet] Current State:", {
      address,
      isConnected,
      connector: connector?.name,
      hasWalletClient: !!walletClient,
      hasSigner: !!signer,
    });
  }, [address, isConnected, walletClient, signer, connector]);

  return {
    account: address || null,
    isConnected,
    connect: async () => setOpen(true),
    disconnect: async () => disconnect(),
    provider: signer?.provider || null,
    signer,
    wallet: walletClient,
    publicKey: address || null,
  };
}
