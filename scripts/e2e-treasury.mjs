/**
 * On-chain end-to-end check for PrivatePayTreasury.
 *
 * Exercises every user-facing money path against a real BOT Chain deployment
 * using deliberately tiny amounts (0.00001 BOT per step) so it is cheap to run
 * on mainnet as well as testnet.
 *
 * Usage:
 *   BOTCHAIN_NETWORK=testnet node scripts/e2e-treasury.mjs
 *   BOTCHAIN_NETWORK=mainnet node scripts/e2e-treasury.mjs
 *
 * Reads the deployed address from deployments/botchain-<chainId>.json.
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
  mainnet: { chainId: 677, name: 'BOT Chain', rpc: process.env.BOTCHAIN_RPC_URL || 'https://rpc.botchain.ai' },
  testnet: { chainId: 968, name: 'BOT Chain Testnet', rpc: process.env.BOTCHAIN_TESTNET_RPC_URL || 'https://rpc.bohr.life' },
};

const netKey = (process.env.BOTCHAIN_NETWORK || 'testnet').toLowerCase();
const net = NETWORKS[netKey];
assert.ok(net, `Unknown BOTCHAIN_NETWORK "${netKey}"`);

const deployment = JSON.parse(
  readFileSync(resolve(root, `deployments/botchain-${net.chainId}.json`), 'utf8')
);
const artifact = JSON.parse(
  readFileSync(resolve(root, 'artifacts/contracts/PrivatePayTreasury.sol/PrivatePayTreasury.json'), 'utf8')
);

const provider = new ethers.JsonRpcProvider(net.rpc, { chainId: net.chainId, name: net.name });
const wallet = new ethers.Wallet(process.env.DEPLOYER_PRIVATE_KEY, provider);
const treasury = new ethers.Contract(deployment.privatePayTreasury, artifact.abi, wallet);

// Small enough that a full run costs a rounding error, large enough to be non-zero.
const AMOUNT = ethers.parseEther('0.00001');

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

const id = (s) => ethers.keccak256(ethers.toUtf8Bytes(`${s}-${Date.now()}-${Math.random()}`));

console.log(`PrivatePayTreasury e2e on ${net.name} (${net.chainId})`);
console.log(`Contract ${deployment.privatePayTreasury}`);
console.log(`Signer   ${wallet.address}`);
console.log(`Balance  ${ethers.formatEther(await provider.getBalance(wallet.address))} BOT\n`);

await check('owner and relayer are set from deployment', async () => {
  assert.equal((await treasury.owner()).toLowerCase(), deployment.deployer.toLowerCase());
  assert.equal((await treasury.relayer()).toLowerCase(), deployment.relayer.toLowerCase());
});

await check('setMetaAddress stores the stealth meta address', async () => {
  const userId = id('user');
  const spendPub = ethers.hexlify(ethers.randomBytes(33));
  const viewPub = ethers.hexlify(ethers.randomBytes(33));
  await (await treasury.setMetaAddress(userId, spendPub, viewPub)).wait();
  const meta = await treasury.getMetaAddress(userId);
  assert.equal(meta[0], spendPub);
  assert.equal(meta[1], viewPub);
});

await check('depositToStealth credits the (recipient, ephemeral) pair', async () => {
  const recipientId = id('recipient');
  const ephemeralPub = id('ephemeral');
  await (await treasury.depositToStealth(recipientId, ephemeralPub, { value: AMOUNT })).wait();
  assert.equal(await treasury.pendingStealth(recipientId, ephemeralPub), AMOUNT);
});

await check('withdrawStealth pays out and zeroes the pending balance', async () => {
  const recipientId = id('recipient2');
  const ephemeralPub = id('ephemeral2');
  await (await treasury.depositToStealth(recipientId, ephemeralPub, { value: AMOUNT })).wait();

  const to = ethers.Wallet.createRandom().address;
  await (await treasury.withdrawStealth(recipientId, ephemeralPub, to, AMOUNT)).wait();

  assert.equal(await treasury.pendingStealth(recipientId, ephemeralPub), 0n);
  assert.equal(await provider.getBalance(to), AMOUNT, 'recipient did not receive the funds');
});

await check('withdrawStealth cannot overdraw a pair', async () => {
  const recipientId = id('recipient3');
  const ephemeralPub = id('ephemeral3');
  await (await treasury.depositToStealth(recipientId, ephemeralPub, { value: AMOUNT })).wait();
  await assert.rejects(() =>
    treasury.withdrawStealth.staticCall(recipientId, ephemeralPub, wallet.address, AMOUNT * 100n)
  );
});

await check('depositToPool accumulates against a commitment', async () => {
  const commitment = id('commitment');
  await (await treasury.depositToPool(commitment, { value: AMOUNT })).wait();
  assert.equal(await treasury.poolBalance(commitment), AMOUNT);
  await (await treasury.depositToPool(commitment, { value: AMOUNT })).wait();
  assert.equal(await treasury.poolBalance(commitment), AMOUNT * 2n, 'top-up should add, not replace');
});

await check('withdraw sends native BOT to a recipient', async () => {
  const to = ethers.Wallet.createRandom().address;
  await (await treasury.withdraw(to, AMOUNT)).wait();
  assert.equal(await provider.getBalance(to), AMOUNT);
});

await check('withdrawBatch pays several recipients in one tx', async () => {
  const a = ethers.Wallet.createRandom().address;
  const b = ethers.Wallet.createRandom().address;
  await (await treasury.withdrawBatch([a, b], [AMOUNT, AMOUNT])).wait();
  assert.equal(await provider.getBalance(a), AMOUNT);
  assert.equal(await provider.getBalance(b), AMOUNT);
});

await check('non-relayer cannot withdraw', async () => {
  const stranger = ethers.Wallet.createRandom().connect(provider);
  const asStranger = treasury.connect(stranger);
  await assert.rejects(() => asStranger.withdraw.staticCall(stranger.address, AMOUNT));
});

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
