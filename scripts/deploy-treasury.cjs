/**
 * Deploy PrivatePayTreasury on BOT Chain.
 *
 * Prerequisites (.env):
 *   DEPLOYER_PRIVATE_KEY  — funded BOT Chain key
 *   RELAYER_ADDRESS       — EOA allowed to call withdraw() (backend relayer)
 *
 * Usage:
 *   npm run contract:deploy:testnet   # chainId 968, dry run first
 *   npm run contract:deploy           # chainId 677, mainnet
 *
 * Writes deployments/botchain-<chainId>.json and prints the env line to set.
 */

const fs = require("node:fs");
const path = require("node:path");
const hre = require("hardhat");

async function main() {
  const relayerAddress = process.env.RELAYER_ADDRESS;
  if (!relayerAddress || !relayerAddress.startsWith("0x")) {
    console.error("Missing RELAYER_ADDRESS in .env (the EOA that will call withdraw).");
    process.exit(1);
  }

  const net = await hre.ethers.provider.getNetwork();
  const chainId = Number(net.chainId);
  console.log(`Deploying PrivatePayTreasury to chainId ${chainId} with relayer ${relayerAddress}`);

  const Treasury = await hre.ethers.getContractFactory("PrivatePayTreasury");
  const treasury = await Treasury.deploy(relayerAddress);

  // ethers v6 uses waitForDeployment/getAddress; v5 uses deployed()/address.
  if (typeof treasury.waitForDeployment === "function") {
    await treasury.waitForDeployment();
  } else {
    await treasury.deployed();
  }
  const address = typeof treasury.getAddress === "function" ? await treasury.getAddress() : treasury.address;
  const txHash = treasury.deploymentTransaction?.()?.hash || treasury.deployTransaction?.hash || null;

  const explorer = chainId === 677 ? "https://scan.botchain.ai" : "https://scan.bohr.life";
  const outDir = path.resolve(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const out = {
    chainId,
    network: chainId === 677 ? "BOT Chain" : "BOT Chain Testnet",
    privatePayTreasury: address,
    relayer: relayerAddress,
    txHash,
    deployedAt: new Date().toISOString(),
    explorer: `${explorer}/address/${address}`,
  };
  fs.writeFileSync(path.join(outDir, `botchain-${chainId}.json`), JSON.stringify(out, null, 2) + "\n");

  console.log("PrivatePayTreasury deployed to:", address);
  console.log("Explorer:", out.explorer);
  console.log("");
  console.log("Next steps:");
  console.log(`1. Set VITE_SHARED_TREASURY_ADDRESS=${address} in .env`);
  console.log("2. Ensure the backend relayer key matches RELAYER_ADDRESS so it can call withdraw(to, amount).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
