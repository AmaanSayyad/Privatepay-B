import {
  botChain,
  BOT_CHAIN_NAME,
  BOTCHAIN_USDT_ADDRESS,
} from "./botchain.js";

// Branding logos
export const APP_LOGO = "/assets/private-pay-logo.svg"; // Private-Pay app logo
export const BASE_LOGO = "/botchain.png";
export const BOTCHAIN_LOGO = "/botchain.png";
export const USDT_LOGO = "/usdt.png";
export const PAYMENT_LINK_SUFFIX = ".privatepay.base";

// Treasury address — from .env
const _sharedTreasury = typeof import.meta !== "undefined" && import.meta.env?.VITE_SHARED_TREASURY_ADDRESS?.trim();
const _baseTreasury = typeof import.meta !== "undefined" && import.meta.env?.VITE_BASE_TREASURY_ADDRESS?.trim();
const _defaultTreasury = "0x71197e7a1CA5A2cb2AD82432B924F69B1E3dB123";

export const SHARED_TREASURY_ADDRESS = _sharedTreasury || _baseTreasury || _defaultTreasury;
export const BASE_TREASURY_ADDRESS = _baseTreasury || _sharedTreasury || _defaultTreasury;

// ---------------------------------------------------------------------------
// BOT Chain — canonical chain config lives in ./botchain.js
// Legacy export names (baseSepolia, USDC_ADDRESS, ...) are kept as aliases so
// no component import has to change. Only the values behind them moved.
// ---------------------------------------------------------------------------
export {
  botChain,
  BOT_CHAIN_ID,
  BOT_CHAIN_NAME,
  BOT_CHAIN_RPC,
  BOT_CHAIN_EXPLORER,
  BOTCHAIN_NETWORK,
  BOTCHAIN_USDT_ADDRESS,
  BOTCHAIN_USDT_DECIMALS,
  explorerTxUrl,
  explorerAddressUrl,
  explorerTokenUrl,
} from "./botchain.js";

// Display Chains — BOT Chain only
export const DISPLAY_CHAINS = [
  { id: "botchain", name: BOT_CHAIN_NAME, imageUrl: BOTCHAIN_LOGO, isTestnet: botChain.testnet },
];

// Payment asset: BOT Chain USDT (6 decimals). Name kept as USDC_ADDRESS for
// import compatibility; prefer BOTCHAIN_USDT_ADDRESS in new code.
export const USDC_ADDRESS = BOTCHAIN_USDT_ADDRESS;

// `baseSepolia` is now BOT Chain. Alias kept so the 20 existing imports keep working.
export const baseSepolia = botChain;

export const CHAINS = [botChain];
export const MAINNET_CHAINS = [botChain];
export const TESTNET_CHAINS = botChain.testnet ? [botChain] : [];
export const customEvmNetworks = [botChain];
