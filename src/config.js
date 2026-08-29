// Branding Logos (Base, ENS, BitGo only)
export const APP_LOGO = "/assets/private-pay-logo.svg"; // Private-Pay app logo
export const BASE_LOGO = "/baselogo.png";
export const ENS_LOGO = "/ethereum-name-service-ens-logo.png";
export const USDC_LOGO = "/usd-coin-usdc-logo.png";
export const ETH_LOGO = "/ethereum-eth-logo.png";
export const BITGO_LOGO = "/bitgo.png";
export const PAYMENT_LINK_SUFFIX = ".privatepay.base";

// Treasury addresses — from .env (Base, ENS, BitGo use shared treasury)
const _sharedTreasury = typeof import.meta !== "undefined" && import.meta.env?.VITE_SHARED_TREASURY_ADDRESS?.trim();
const _baseTreasury = typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_TREASURY_ADDRESS?.trim();
const _ensTreasury = typeof import.meta !== "undefined" && import.meta.env?.VITE_ENS_TREASURY_ADDRESS?.trim();
const _bitgoTreasury = typeof import.meta !== "undefined" && import.meta.env?.VITE_BITGO_TREASURY_ADDRESS?.trim();
const _defaultTreasury = "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123";

export const SHARED_TREASURY_ADDRESS = _sharedTreasury || _baseTreasury || _defaultTreasury;
export const BASE_TREASURY_ADDRESS = _baseTreasury || _sharedTreasury || _defaultTreasury;
export const ENS_TREASURY_ADDRESS = _ensTreasury || _sharedTreasury || _defaultTreasury;
export const BITGO_TREASURY_ADDRESS = _bitgoTreasury || _sharedTreasury || _defaultTreasury;

// Display Chains — Base only (mainnet for ENS resolution)
export const DISPLAY_CHAINS = [
  { id: "base-sepolia", name: "Base Sepolia", imageUrl: BASE_LOGO, isTestnet: true },
];

// Token Addresses (Base Sepolia) — optional override from .env
const _baseAssetAddress = typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_ASSET_ADDRESS?.trim();
export const USDC_ADDRESS = _baseAssetAddress || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";

// Base Sepolia — RPC from .env
const _baseRpc = typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_RPC_URL?.trim();
const _baseChainId = typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_CHAIN_ID != null
  ? Number(import.meta.env.VITE_BASE_CHAIN_ID) : 84532;

export const baseSepolia = {
  id: _baseChainId,
  name: "Base Sepolia",
  network: "base-sepolia",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: [_baseRpc || "https://sepolia.base.org"] },
    public: { http: [_baseRpc || "https://sepolia.base.org"] },
  },
  blockExplorers: {
    default: { name: "Basescan", url: "https://sepolia.basescan.org" },
  },
  testnet: true,
};

// Ethereum Mainnet (ENS resolution only) — RPC from .env
const _ethMainnetRpc = typeof import.meta !== "undefined" && import.meta.env?.VITE_ETH_MAINNET_RPC_URL?.trim();
export const mainnet = {
  id: 1,
  name: "Ethereum",
  network: "homestead",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: { http: [_ethMainnetRpc || "https://ethereum-rpc.publicnode.com"] },
    public: { http: [_ethMainnetRpc || "https://ethereum-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://etherscan.io" },
  },
  testnet: false,
};

// Base + Ethereum mainnet only (mainnet required for ENS resolution)
export const CHAINS = [baseSepolia, mainnet];
export const MAINNET_CHAINS = [mainnet];
export const TESTNET_CHAINS = [baseSepolia];
export const customEvmNetworks = [baseSepolia, mainnet];

