// BOT Chain — canonical network config (mirrors Gemetra-BotChain/src/config/botchain.ts).
// Single source of truth for chain id, RPC, explorer and the USDT asset.

const requested = (import.meta.env?.VITE_BOTCHAIN_NETWORK || "").trim().toLowerCase();
export const BOTCHAIN_NETWORK = requested === "testnet" ? "testnet" : "mainnet";

const NETWORKS = {
  mainnet: {
    id: 677,
    name: "BOT Chain",
    rpc: "https://rpc.botchain.ai",
    explorer: "https://scan.botchain.ai",
    usdt: "0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c",
  },
  testnet: {
    id: 968,
    name: "BOT Chain Testnet",
    rpc: "https://rpc.bohr.life",
    explorer: "https://scan.bohr.life",
    usdt: "0x75edC9335175Fc0552D51D48439F229c10420fe3",
  },
};

const net = NETWORKS[BOTCHAIN_NETWORK];

export const BOT_CHAIN_ID = Number(import.meta.env?.VITE_BOTCHAIN_CHAIN_ID) || net.id;
export const BOT_CHAIN_NAME = net.name;
export const BOT_CHAIN_RPC = (import.meta.env?.VITE_BOTCHAIN_RPC_URL || "").trim() || net.rpc;
export const BOT_CHAIN_EXPLORER = (import.meta.env?.VITE_BOTCHAIN_EXPLORER || "").trim() || net.explorer;
export const BOTCHAIN_USDT_ADDRESS = (import.meta.env?.VITE_BOTCHAIN_USDT_ADDRESS || "").trim() || net.usdt;
export const BOTCHAIN_USDT_DECIMALS = 6;

export const botChain = {
  id: BOT_CHAIN_ID,
  name: BOT_CHAIN_NAME,
  network: "botchain",
  nativeCurrency: { decimals: 18, name: "BOT", symbol: "BOT" },
  rpcUrls: {
    default: { http: [BOT_CHAIN_RPC] },
    public: { http: [BOT_CHAIN_RPC] },
  },
  blockExplorers: {
    default: { name: "BOTScan", url: BOT_CHAIN_EXPLORER },
  },
  testnet: BOTCHAIN_NETWORK === "testnet",
};

export function explorerTxUrl(hash) {
  const h = (hash || "").trim();
  return h ? `${BOT_CHAIN_EXPLORER}/tx/${h}` : BOT_CHAIN_EXPLORER;
}

export function explorerAddressUrl(address) {
  const a = (address || "").trim();
  return a ? `${BOT_CHAIN_EXPLORER}/address/${a}` : BOT_CHAIN_EXPLORER;
}

export function explorerTokenUrl(address) {
  const a = (address || "").trim();
  return a ? `${BOT_CHAIN_EXPLORER}/token/${a}` : BOT_CHAIN_EXPLORER;
}
