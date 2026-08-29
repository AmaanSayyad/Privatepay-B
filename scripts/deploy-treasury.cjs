/**
 * Deploy PrivatePayTreasury to BOT Chain.
 *
 * Compile first (`npm run contract:compile`), then run this. It reads the
 * Hardhat artifact and deploys with plain ethers — no hardhat-ethers plugin
 * needed, which keeps the dependency list as-is.
 *
 * .env:
 *   DEPLOYER_PRIVATE_KEY  — funded BOT Chain key
 *   RELAYER_ADDRESS       — EOA allowed to call withdraw() (defaults to the deployer)
 *
 * Usage:
 *   npm run contract:deploy:testnet   # chainId 968
 *   npm run contract:deploy           # chainId 677 (mainnet)
 *
 * Writes deployments/botchain-<chainId>.json.
 */
require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');
const { ethers } = require('ethers');

const NETWORKS = {
  mainnet: {
    chainId: 677,
    name: 'BOT Chain',
    rpc: process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai',
    explorer: 'https://scan.botchain.ai',
  },
  testnet: {
    chainId: 968,
    name: 'BOT Chain Testnet',
    rpc: process.env.BOTCHAIN_TESTNET_RPC_URL || 'https://rpc.bohr.life',
    explorer: 'https://scan.bohr.life',
  },
};

const root = path.resolve(__dirname, '..');
const artifactPath = path.join(
  root,
  'artifacts/contracts/PrivatePayTreasury.sol/PrivatePayTreasury.json'
);

async function main() {
  const netKey = (process.env.BOTCHAIN_NETWORK || 'mainnet').toLowerCase();
  const net = NETWORKS[netKey];
  if (!net) throw new Error(`Unknown BOTCHAIN_NETWORK "${netKey}" (use mainnet or testnet)`);

  const key = process.env.DEPLOYER_PRIVATE_KEY;
  if (!key) throw new Error('DEPLOYER_PRIVATE_KEY is not set in .env');

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`Artifact not found at ${artifactPath} — run "npm run contract:compile" first`);
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const provider = new ethers.JsonRpcProvider(net.rpc, {
    chainId: net.chainId,
    name: net.name,
  });
  const wallet = new ethers.Wallet(key, provider);
  const relayer = process.env.RELAYER_ADDRESS || wallet.address;

  const balance = await provider.getBalance(wallet.address);
  console.log(`Network   ${net.name} (${net.chainId})`);
  console.log(`Deployer  ${wallet.address}`);
  console.log(`Balance   ${ethers.formatEther(balance)} BOT`);
  console.log(`Relayer   ${relayer}`);

  if (balance === 0n) throw new Error('Deployer has no BOT to pay for gas');

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);
  const treasury = await factory.deploy(relayer);
  console.log(`Deploying… tx ${treasury.deploymentTransaction().hash}`);
  await treasury.waitForDeployment();

  const address = await treasury.getAddress();
  const receipt = await treasury.deploymentTransaction().wait();

  const outDir = path.join(root, 'deployments');
  fs.mkdirSync(outDir, { recursive: true });
  const out = {
    chainId: net.chainId,
    network: net.name,
    privatePayTreasury: address,
    deployer: wallet.address,
    relayer,
    txHash: receipt.hash,
    gasUsed: receipt.gasUsed.toString(),
    deployedAt: new Date().toISOString(),
    explorer: `${net.explorer}/address/${address}`,
  };
  fs.writeFileSync(
    path.join(outDir, `botchain-${net.chainId}.json`),
    JSON.stringify(out, null, 2) + '\n'
  );

  console.log('');
  console.log(`PrivatePayTreasury deployed to ${address}`);
  console.log(`Gas used  ${receipt.gasUsed}`);
  console.log(`Explorer  ${out.explorer}`);
  console.log('');
  console.log(`Set VITE_SHARED_TREASURY_ADDRESS=${address} in .env`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
