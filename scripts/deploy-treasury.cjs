/**
 * Deploy PrivatePayTreasury on Base Sepolia.
 *
 * Prerequisites:
 *   - .env with DEPLOYER_PRIVATE_KEY (or VITE_TREASURY_PRIVATE_KEY) and RELAYER_ADDRESS
 *   - RELAYER_ADDRESS = address that may call withdraw() (your backend/relayer EOA).
 *
 * Usage:
 *   npx hardhat run scripts/deploy-treasury.cjs --network baseSepolia
 *
 * After deploy:
 *   - Set BASE_TREASURY_ADDRESS (or your app's env var) in .env to the deployed address.
 *   - Backend relayer uses the key for RELAYER_ADDRESS to call treasury.withdraw(userAddress, amount).
 */

const hre = require("hardhat");

async function main() {
  const relayerAddress = process.env.RELAYER_ADDRESS;
  if (!relayerAddress || !relayerAddress.startsWith("0x")) {
    console.error("Missing RELAYER_ADDRESS in .env (e.g. the EOA that will call withdraw).");
    process.exit(1);
  }

  console.log("Deploying PrivatePayTreasury (Private-Pay) with relayer:", relayerAddress);
  const Treasury = await hre.ethers.getContractFactory("PrivatePayTreasury");
  const treasury = await Treasury.deploy(relayerAddress);
  await treasury.deployed();
  const address = treasury.address;
  console.log("PrivatePayTreasury (Private-Pay) deployed to:", address);
  console.log("");
  console.log("Next steps:");
  console.log("1. Set BASE_TREASURY_ADDRESS=" + address + " in .env");
  console.log("2. Ensure your backend relayer key matches RELAYER_ADDRESS so it can call withdraw(to, amount).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
