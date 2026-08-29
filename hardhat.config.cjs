/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();

// BOT Chain — see BOTCHAIN_MIGRATION.md
const BOTCHAIN_RPC = (process.env.BOTCHAIN_RPC_URL || process.env.VITE_BOTCHAIN_RPC_URL || "https://rpc.botchain.ai").trim();
const BOTCHAIN_TESTNET_RPC = (process.env.BOTCHAIN_TESTNET_RPC_URL || "https://rpc.bohr.life").trim();
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.VITE_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY || "";
const accounts = DEPLOYER_KEY ? [DEPLOYER_KEY.replace(/^0x/, "")] : [];

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 677,
    },
    botchain: {
      url: BOTCHAIN_RPC,
      chainId: 677,
      accounts,
    },
    botchainTestnet: {
      url: BOTCHAIN_TESTNET_RPC,
      chainId: 968,
      accounts,
    },
  },
  etherscan: {
    apiKey: { botchain: "no-api-key-needed" },
    customChains: [
      {
        network: "botchain",
        chainId: 677,
        urls: {
          apiURL: "https://scan.botchain.ai/api",
          browserURL: "https://scan.botchain.ai",
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts-test",
  },
};
