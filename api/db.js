/**
 * Vercel Serverless Function: POST /api/db
 *
 * Single Neon Postgres gateway for the app. Replaces the Supabase anon client:
 * the browser no longer holds database credentials, and the action allow-list
 * below is what used to be enforced by Supabase RLS.
 *
 * Body: { action: string, params?: object }
 */
import pg from 'pg';

const { Pool } = pg;

let pool;
function db() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error('DATABASE_URL is not configured');
    pool = new Pool({ connectionString, max: 3, idleTimeoutMillis: 10000 });
  }
  return pool;
}

const one = async (sql, params = []) => (await db().query(sql, params)).rows[0] ?? null;
const many = async (sql, params = []) => (await db().query(sql, params)).rows;

const lower = (v) => (v == null ? null : String(v).toLowerCase().trim());
const num = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new Error('Invalid numeric value');
  return n;
};

const BALANCE_FIELDS = {
  USDC: 'usdc_balance',
  USDT: 'usdc_balance',
  SEPOLIA_ETH: 'sepolia_eth_balance',
  ETH: 'eth_balance',
  BOT: 'eth_balance',
};
const balanceField = (currency) =>
  BALANCE_FIELDS[String(currency || 'BOT').toUpperCase()] || 'eth_balance';

const actions = {
  async registerUser({ walletAddress, username }) {
    if (!walletAddress) throw new Error('walletAddress required');
    const user = await one(
      `insert into users (wallet_address, username) values ($1, $2)
       on conflict (wallet_address) do update
         set username = coalesce(excluded.username, users.username)
       returning *`,
      [walletAddress, username ?? null]
    );
    await one(
      `insert into balances (username, wallet_address) values ($1, $2)
       on conflict (wallet_address) do nothing returning *`,
      [username ?? null, walletAddress]
    );
    return user;
  },

  async getUserByUsername({ username }) {
    return one(`select * from users where username = $1`, [username]);
  },

  async getUserByWallet({ walletAddress }) {
    if (!walletAddress) return null;
    return one(`select * from users where wallet_address = $1`, [walletAddress]);
  },

  async getPaymentLinkByUsername({ username }) {
    if (!username) return null;
    return one(`select * from payment_links where username = $1`, [username]);
  },

  async isAliasAvailable({ alias }) {
    const a = lower(alias);
    if (!a) return { available: false };
    const link = await one(`select id from payment_links where alias = $1`, [a]);
    if (link) return { available: false };
    const user = await one(`select id from users where username = $1`, [a]);
    return { available: !user };
  },

  async updateUsername({ walletAddress, username }) {
    return one(
      `update users set username = $2 where wallet_address = $1 returning *`,
      [walletAddress, username]
    );
  },

  async getUserBalance({ username }) {
    return one(`select * from balances where username = $1`, [username]);
  },

  async getUserBalanceByWallet({ walletAddress }) {
    if (!walletAddress) return null;
    return one(`select * from balances where wallet_address = $1`, [walletAddress]);
  },

  async recordPayment({ senderAddress, recipientUsername, amount, txHash, currency }) {
    const cur = String(currency || 'BOT').toUpperCase();
    const value = num(amount);
    const field = balanceField(cur);
    const client = await db().connect();
    try {
      await client.query('begin');
      const paymentResult = await client.query(
        `insert into payments (sender_address, recipient_username, amount, currency, tx_hash, status)
         values ($1, $2, $3, $4, $5, 'completed') returning *`,
        [senderAddress ?? null, recipientUsername, value, cur, txHash ?? null]
      );
      // Resolve the wallet so a balance row keyed by wallet is reused rather than duplicated.
      const refResult = await client.query(
        `select coalesce(
           (select wallet_address from users where username = $1),
           (select wallet_address from payment_links where alias = $1)
         ) as wallet_address`,
        [recipientUsername]
      );
      const wallet = refResult.rows[0]?.wallet_address ?? recipientUsername;
      await client.query(
        `insert into balances (username, wallet_address, ${field})
         values ($1, $2, $3)
         on conflict (wallet_address) do update
           set ${field} = balances.${field} + $3,
               username = coalesce(balances.username, excluded.username),
               updated_at = now()`,
        [recipientUsername, wallet, value]
      );
      await client.query('commit');
      return paymentResult.rows[0];
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  },

  async withdrawFunds({ username, amount, txHash, currency }) {
    const cur = String(currency || 'BOT').toUpperCase();
    const value = num(amount);
    if (value <= 0) throw new Error('Amount must be positive');
    const field = balanceField(cur);
    const client = await db().connect();
    try {
      await client.query('begin');
      // Lock the row so two concurrent withdrawals cannot both pass the check.
      const balanceResult = await client.query(
        `select * from balances where username = $1 for update`,
        [username]
      );
      const balance = balanceResult.rows[0];
      const current = Number(balance?.[field] ?? 0);
      if (!balance || current < value) {
        throw new Error(`Insufficient ${cur} balance`);
      }
      const withdrawalResult = await client.query(
        `insert into payments (sender_address, recipient_username, amount, currency, tx_hash, status)
         values ('treasury', $1, $2, $3, $4, 'withdrawn') returning *`,
        [username, -value, cur, txHash ?? null]
      );
      const updatedResult = await client.query(
        `update balances set ${field} = ${field} - $2, updated_at = now()
          where username = $1 returning ${field} as new_balance`,
        [username, value]
      );
      await client.query('commit');
      return {
        success: true,
        newBalance: Number(updatedResult.rows[0].new_balance),
        withdrawal: withdrawalResult.rows[0],
      };
    } catch (err) {
      await client.query('rollback');
      throw err;
    } finally {
      client.release();
    }
  },

  async getUserPayments({ username }) {
    const user = await one(`select wallet_address from users where username = $1`, [username]);
    const wallet = user?.wallet_address ?? null;
    const aliases = new Set([username].filter(Boolean));
    if (wallet) {
      const links = await many(
        `select alias, username from payment_links where wallet_address = $1`,
        [wallet]
      );
      for (const l of links) {
        if (l.alias) aliases.add(l.alias);
        if (l.username) aliases.add(l.username);
      }
    }
    const received = await many(
      `select * from payments where recipient_username = any($1::text[]) order by created_at desc`,
      [[...aliases]]
    );
    const sent = wallet
      ? (
          await many(
            `select * from payments where sender_address = $1 order by created_at desc`,
            [wallet]
          )
        ).map((p) => ({ ...p, is_sent: true }))
      : [];
    return [...received, ...sent].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  async createPaymentLink({ walletAddress, username, alias }) {
    return one(
      `insert into payment_links (wallet_address, username, alias) values ($1, $2, $3) returning *`,
      [walletAddress, username ?? null, alias]
    );
  },

  async getPaymentLinks({ walletAddress }) {
    return many(
      `select * from payment_links where wallet_address = $1 order by created_at desc`,
      [walletAddress]
    );
  },

  async getPaymentLinkByAlias({ alias }) {
    return one(`select * from payment_links where alias = $1`, [alias]);
  },

  async deletePaymentLink({ id }) {
    await db().query(`delete from payment_links where id = $1`, [id]);
    return { success: true };
  },

  async getUserPoints({ walletAddress }) {
    if (!walletAddress) return null;
    return one(
      `insert into user_points (wallet_address) values ($1)
       on conflict (wallet_address) do update set wallet_address = excluded.wallet_address
       returning *`,
      [walletAddress]
    );
  },

  async awardPoints({
    walletAddress,
    actionType,
    description,
    relatedPaymentId,
    relatedPaymentLinkId,
    metadata,
  }) {
    const row = await one(`select award_points($1, $2, $3, $4, $5, $6) as points`, [
      walletAddress,
      actionType,
      description ?? null,
      relatedPaymentId ?? null,
      relatedPaymentLinkId ?? null,
      metadata ? JSON.stringify(metadata) : null,
    ]);
    return { points: row?.points ?? 0 };
  },

  async getPointsHistory({ walletAddress, limit }) {
    return many(
      `select * from point_transactions where wallet_address = $1
        order by created_at desc limit $2`,
      [walletAddress, Math.min(Number(limit) || 50, 500)]
    );
  },

  async getPointsLeaderboard({ limit }) {
    return many(
      `select id, wallet_address, total_points, lifetime_points, level
         from user_points order by lifetime_points desc limit $1`,
      [Math.min(Number(limit) || 100, 500)]
    );
  },

  async getPointsConfig() {
    return many(`select * from points_config where is_active order by points_value desc`);
  }
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, params } = req.body || {};
  const fn = Object.prototype.hasOwnProperty.call(actions, action) ? actions[action] : null;
  if (!fn) return res.status(400).json({ error: 'unknown_action', action: String(action) });

  try {
    const data = await fn(params || {});
    return res.status(200).json({ data });
  } catch (error) {
    console.error(`[api/db] ${action} failed:`, error);
    return res.status(500).json({ error: 'db_error', message: error.message });
  }
}

// Exported for the local self-check in scripts/check-db.mjs.
export { actions };
