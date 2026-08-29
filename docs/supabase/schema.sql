-- =============================================================================
-- PrivatePay (Aleo) – Full Supabase Schema
-- Run this entire file in Supabase Dashboard → SQL Editor → New query
-- =============================================================================

-- Enable UUID extension (required for id columns)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================================================
-- 1. USERS
-- Stores wallet address and username (for payment links and balance lookup)
-- =============================================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for users (anon)"
  ON users FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 2. BALANCES
-- Tracks available balance per username (updated on payment/withdraw)
-- =============================================================================
CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL,
  available_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balances_username ON balances(username);
CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet_address);

ALTER TABLE balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for balances (anon)"
  ON balances FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 3. PAYMENTS
-- Records sent/received payments and withdrawals (tx_hash, amount, status)
-- =============================================================================
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_address TEXT NOT NULL,
  recipient_username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_recipient ON payments(recipient_username);
CREATE INDEX IF NOT EXISTS idx_payments_sender ON payments(sender_address);
CREATE INDEX IF NOT EXISTS idx_payments_created ON payments(created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for payments (anon)"
  ON payments FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- 4. PAYMENT_LINKS
-- Links alias (e.g. "john") to username and wallet for pay pages
-- =============================================================================
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  username TEXT NOT NULL,
  alias TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_wallet ON payment_links(wallet_address);
CREATE INDEX IF NOT EXISTS idx_payment_links_alias ON payment_links(alias);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for payment_links (anon)"
  ON payment_links FOR ALL
  USING (true)
  WITH CHECK (true);

-- =============================================================================
-- Optional: trigger to keep balances.updated_at in sync
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS balances_updated_at ON balances;
CREATE TRIGGER balances_updated_at
  BEFORE UPDATE ON balances
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at();

-- =============================================================================
-- Verify tables exist
-- =============================================================================
-- Run: SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('users','balances','payments','payment_links');
-- You should see all four tables.
