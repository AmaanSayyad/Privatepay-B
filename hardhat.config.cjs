/** @type import('hardhat/config').HardhatUserConfig */
require("dotenv").config();

const BASE_SEPOLIA_RPC = process.env.VITE_BASE_RPC_URL || process.env.VITE_BASE_SEPOLIA_RPC || "https://sepolia.base.org";
const DEPLOYER_KEY = process.env.DEPLOYER_PRIVATE_KEY || process.env.VITE_TREASURY_PRIVATE_KEY || process.env.TREASURY_PRIVATE_KEY || "";

module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    hardhat: {
      chainId: 84532,
    },
    baseSepolia: {
      url: BASE_SEPOLIA_RPC.trim(),
      chainId: 84532,
      accounts: DEPLOYER_KEY ? [DEPLOYER_KEY.replace(/^0x/, "")] : [],
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts-test",
  },
};
