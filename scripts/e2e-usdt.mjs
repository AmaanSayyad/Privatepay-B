/**
 * On-chain check for the USDT payment path.
 *
 * PrivatePayTreasury holds native BOT only, so USDT moves wallet-to-treasury as
 * a plain ERC-20 transfer and back out from the treasury key — exactly what
 * SendPage does. This exercises that path against the real network using the
 * app's own constants, so a wrong token address or decimal count fails here.
 *
 * Usage:
 *   BOTCHAIN_NETWORK=mainnet node scripts/e2e-usdt.mjs
 *   BOTCHAIN_NETWORK=testnet node scripts/e2e-usdt.mjs
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { ethers } from 'ethers';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const NETWORKS = {
  mainnet: {
    chainId: 677,
    name: 'BOT Chain',
    rpc: process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai',
    usdt: '0xababc7ddc03e501d190c676bf3d92ef0e6e87a3c',
  },
  testnet: {
    chainId: 968,
    name: 'BOT Chain Testnet',
    rpc: process.env.BOTCHAIN_TESTNET_RPC_URL || 'https://rpc.bohr.life',
    usdt: '0x75edC9335175Fc0552D51D48439F229c10420fe3',
  },
};

const netKey = (process.env.BOTCHAIN_NETWORK || 'mainnet').toLowerCase();
const net = NETWORKS[netKey];
assert.ok(net, `Unknown BOTCHAIN_NETWORK "${netKey}"`);

const deployment = JSON.parse(
  readFileSync(resolve(root, `deployments/botchain-${net.chainId}.json`), 'utf8')
);

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) public returns (bool)',
  'function balanceOf(address account) public view returns (uint256)',
  'function decimals() public view returns (uint8)',
  'function symbol() public view returns (string)',
];

const provider = new ethers.JsonRpcProvider(net.rpc, { chainId: net.chainId, name: net.name });
const treasuryWallet = new ethers.Wallet(process.env.TREASURY_PRIVATE_KEY, provider);
const usdt = new ethers.Contract(net.usdt, ERC20_ABI, treasuryWallet);

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}: ${err.shortMessage || err.message}`);
  }
};

console.log(`Private-Pay USDT path on ${net.name} (${net.chainId})`);
console.log(`Treasury contract ${deployment.privatePayTreasury}`);
console.log(`Treasury wallet   ${treasuryWallet.address}\n`);

// The app hardcodes 6 decimals for USDT; if the token disagrees, every amount
// the UI sends is wrong by orders of magnitude.
const APP_ASSUMED_DECIMALS = 6;
let decimals;

await check('the configured token really is USDT with the decimals the app assumes', async () => {
  const [symbol, dec] = await Promise.all([usdt.symbol(), usdt.decimals()]);
  decimals = Number(dec);
  assert.equal(symbol, 'USDT');
  assert.equal(
    decimals,
    APP_ASSUMED_DECIMALS,
    `SendPage hardcodes ${APP_ASSUMED_DECIMALS} decimals but the token uses ${decimals}`
  );
});

const AMOUNT = ethers.parseUnits('0.001', APP_ASSUMED_DECIMALS);

// A throwaway wallet stands in for the player.
const player = ethers.Wallet.createRandom().connect(provider);

await check('fund the throwaway player wallet with gas and USDT', async () => {
  await (await treasuryWallet.sendTransaction({
    to: player.address,
    value: ethers.parseEther('0.002'),
  })).wait();
  await (await usdt.transfer(player.address, AMOUNT)).wait();
  assert.equal(await usdt.balanceOf(player.address), AMOUNT);
});

await check('player sends USDT to the treasury, as SendPage does', async () => {
  const before = await usdt.balanceOf(treasuryWallet.address);
  const asPlayer = new ethers.Contract(net.usdt, ERC20_ABI, player);
  const receipt = await (await asPlayer.transfer(treasuryWallet.address, AMOUNT)).wait();
  assert.equal(receipt.status, 1);
  assert.equal(await usdt.balanceOf(treasuryWallet.address), before + AMOUNT);
  assert.equal(await usdt.balanceOf(player.address), 0n);
});

await check('treasury pays USDT back out, as the withdraw path does', async () => {
  const before = await usdt.balanceOf(player.address);
  const tBalance = await usdt.balanceOf(treasuryWallet.address);
  assert.ok(tBalance >= AMOUNT, 'treasury is short of USDT');

  await (await usdt.transfer(player.address, AMOUNT)).wait();
  assert.equal(await usdt.balanceOf(player.address), before + AMOUNT);
});

await check('a transfer beyond the balance is rejected by the token', async () => {
  const asPlayer = new ethers.Contract(net.usdt, ERC20_ABI, player);
  const tooMuch = ethers.parseUnits('1000000', APP_ASSUMED_DECIMALS);
  await assert.rejects(() =>
    asPlayer.transfer.staticCall(treasuryWallet.address, tooMuch, { from: player.address })
  );
});

// Sweep whatever is left back so the throwaway wallet strands nothing.
try {
  const asPlayer = new ethers.Contract(net.usdt, ERC20_ABI, player);
  const left = await usdt.balanceOf(player.address);
  if (left > 0n) await (await asPlayer.transfer(treasuryWallet.address, left)).wait();

  const gas = await provider.getBalance(player.address);
  const fee = ethers.parseEther('0.0005');
  if (gas > fee) {
    await (await player.sendTransaction({
      to: treasuryWallet.address,
      value: gas - fee,
    })).wait();
  }
} catch {
  /* sweeping is best-effort */
}

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
