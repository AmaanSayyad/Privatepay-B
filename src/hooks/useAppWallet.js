/**
 * App wallet hook — BOT Chain (EVM) via Wagmi and ConnectKit (Family Adapter).
 * Exposes { account, isConnected, connect, disconnect, provider, signer }
 */
import { BrowserProvider, JsonRpcSigner } from "ethers";
import { useAccount, useDisconnect, useWalletClient, useChainId, useSwitchChain } from "wagmi";
import { useModal } from "connectkit";
import { useMemo, useEffect, useCallback } from "react";
import { botChain } from "../botchain.js";

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
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  const isOnBotChain = chainId === botChain.id;

  /**
   * Move the wallet to BOT Chain and confirm it landed there.
   *
   * Every transfer here is native BOT or BOT Chain USDT. A wallet left on
   * another network would send that value on the wrong chain, so callers must
   * await this before signing anything and let it throw if it fails.
   */
  const ensureBotChain = useCallback(async () => {
    if (chainId === botChain.id) return;
    if (!switchChainAsync) {
      throw new Error(`Please switch your wallet to ${botChain.name} and try again.`);
    }
    try {
      await switchChainAsync({ chainId: botChain.id });
    } catch (err) {
      throw new Error(
        `This app only works on ${botChain.name}. Approve the network switch in your wallet, then try again.`
      );
    }
  }, [chainId, switchChainAsync]);

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
    // No window.ethereum fallback: it builds a provider with no network, which
    // adopts whatever chain the wallet happens to be on. Waiting for wagmi's
    // client is the only way to know which chain we are about to sign for.
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
    chainId,
    isOnBotChain,
    ensureBotChain,
    connect: async () => setOpen(true),
    disconnect: async () => disconnect(),
    provider: signer?.provider || null,
    signer,
    wallet: walletClient,
    publicKey: address || null,
  };
}
