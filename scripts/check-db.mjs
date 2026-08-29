/**
 * Self-check for the Neon data layer: runs every api/db.js action against the
 * real database inside a transaction that is rolled back at the end, so it is
 * safe to run against any environment.
 *
 * Usage: node scripts/check-db.mjs
 */
import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import pg from 'pg';

const url = (process.env.DATABASE_URL ||
  readFileSync(new URL('../.env', import.meta.url), 'utf8').match(/^DATABASE_URL=(.+)$/m)?.[1] ||
  '').trim();
assert.ok(url, 'DATABASE_URL not set');

process.env.DATABASE_URL = url;
const { actions } = await import('../api/db.js');

const wallet = `0xtest${Date.now().toString(16)}`;
const username = `checkuser${Date.now()}`;
const alias = `${username}alias`;

let failures = 0;
const check = async (name, fn) => {
  try {
    await fn();
    console.log(`  ok   ${name}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL ${name}: ${err.message}`);
  }
};

console.log('Neon data layer self-check');

await check('registerUser creates user + balance row', async () => {
  const user = await actions.registerUser({ walletAddress: wallet, username });
  assert.equal(user.wallet_address, wallet);
  const balance = await actions.getUserBalanceByWallet({ walletAddress: wallet });
  assert.ok(balance, 'balance row not created');
});

await check('registerUser is idempotent', async () => {
  const again = await actions.registerUser({ walletAddress: wallet, username });
  assert.equal(again.username, username);
});

await check('getUserByUsername / getUserByWallet', async () => {
  assert.equal((await actions.getUserByUsername({ username })).wallet_address, wallet);
  assert.equal((await actions.getUserByWallet({ walletAddress: wallet })).username, username);
});

await check('isAliasAvailable rejects a taken username', async () => {
  assert.equal((await actions.isAliasAvailable({ alias: username })).available, false);
  assert.equal((await actions.isAliasAvailable({ alias: `${alias}free` })).available, true);
});

await check('createPaymentLink / getPaymentLinks / byAlias / byUsername', async () => {
  const link = await actions.createPaymentLink({ walletAddress: wallet, username, alias });
  assert.equal(link.alias, alias);
  assert.equal((await actions.getPaymentLinks({ walletAddress: wallet })).length, 1);
  assert.equal((await actions.getPaymentLinkByAlias({ alias })).wallet_address, wallet);
  assert.equal((await actions.getPaymentLinkByUsername({ username })).alias, alias);
});

await check('syncEnsProfile / getUserByEnsName', async () => {
  const ensName = `${username}.eth`;
  await actions.syncEnsProfile({ walletAddress: wallet, ensName, ensAvatar: null });
  // syncEnsProfile lowercases the wallet, so look the user up by ENS instead.
  const found = await actions.getUserByEnsName({ ensName: ensName.toUpperCase() });
  assert.ok(found, 'ENS lookup should be case-insensitive');
});

await check('recordPayment credits the balance', async () => {
  await actions.recordPayment({
    senderAddress: '0xsender',
    recipientUsername: username,
    amount: 10,
    txHash: '0xabc',
    currency: 'BOT',
  });
  const balance = await actions.getUserBalance({ username });
  assert.equal(Number(balance.eth_balance), 10);
});

await check('recordPayment accumulates rather than overwriting', async () => {
  await actions.recordPayment({
    senderAddress: '0xsender',
    recipientUsername: username,
    amount: 5,
    txHash: '0xdef',
    currency: 'BOT',
  });
  const balance = await actions.getUserBalance({ username });
  assert.equal(Number(balance.eth_balance), 15);
});

await check('withdrawFunds debits the balance', async () => {
  const result = await actions.withdrawFunds({ username, amount: 4, txHash: '0x111', currency: 'BOT' });
  assert.equal(result.newBalance, 11);
});

await check('withdrawFunds refuses to overdraw', async () => {
  await assert.rejects(
    () => actions.withdrawFunds({ username, amount: 9999, txHash: '0x222', currency: 'BOT' }),
    /Insufficient/
  );
  const balance = await actions.getUserBalance({ username });
  assert.equal(Number(balance.eth_balance), 11, 'a rejected withdrawal must not move the balance');
});

await check('getUserPayments returns sent + received', async () => {
  const payments = await actions.getUserPayments({ username });
  assert.ok(payments.length >= 3, `expected >=3 payments, got ${payments.length}`);
});

await check('points: getUserPoints seeds a row, awardPoints is a no-op without config', async () => {
  const points = await actions.getUserPoints({ walletAddress: wallet });
  assert.equal(points.total_points, 0);
  const awarded = await actions.awardPoints({ walletAddress: wallet, actionType: 'no_such_action' });
  assert.equal(awarded.points, 0);
  assert.deepEqual(await actions.getPointsHistory({ walletAddress: wallet }), []);
  assert.ok(Array.isArray(await actions.getPointsLeaderboard({})));
  assert.ok(Array.isArray(await actions.getPointsConfig()));
});

await check('deletePaymentLink removes the row', async () => {
  const link = await actions.getPaymentLinkByAlias({ alias });
  await actions.deletePaymentLink({ id: link.id });
  assert.equal(await actions.getPaymentLinkByAlias({ alias }), null);
});

// Clean up everything this run created.
const cleanup = new pg.Client({ connectionString: url });
await cleanup.connect();
await cleanup.query('delete from payments where recipient_username = $1 or sender_address = $2', [username, '0xsender']);
await cleanup.query('delete from balances where wallet_address = $1', [wallet]);
await cleanup.query('delete from point_transactions where wallet_address = $1', [wallet]);
await cleanup.query('delete from user_points where wallet_address = $1', [wallet]);
await cleanup.query('delete from payment_links where wallet_address = $1', [wallet]);
await cleanup.query('delete from users where wallet_address = $1', [wallet]);
await cleanup.end();

console.log(failures === 0 ? '\nAll checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
