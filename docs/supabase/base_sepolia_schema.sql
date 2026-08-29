-- =============================================================================
-- PrivatePay (Base Sepolia) – Full Supabase Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. USERS
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL UNIQUE,
  username TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(wallet_address);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for users (anon)" ON users FOR ALL USING (true) WITH CHECK (true);

-- 2. BALANCES
-- Dual balance support for ETH and USDC
CREATE TABLE IF NOT EXISTS balances (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username TEXT NOT NULL UNIQUE,
  wallet_address TEXT NOT NULL UNIQUE,
  eth_balance NUMERIC NOT NULL DEFAULT 0,
  usdc_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_balances_username ON balances(username);
CREATE INDEX IF NOT EXISTS idx_balances_wallet ON balances(wallet_address);

ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for balances (anon)" ON balances FOR ALL USING (true) WITH CHECK (true);

-- 3. PAYMENTS
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_address TEXT NOT NULL,
  recipient_username TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'ETH', -- 'ETH' or 'USDC'
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_recipient ON payments(recipient_username);
CREATE INDEX IF NOT EXISTS idx_payments_currency ON payments(currency);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for payments (anon)" ON payments FOR ALL USING (true) WITH CHECK (true);

-- 4. PAYMENT_LINKS
CREATE TABLE IF NOT EXISTS payment_links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  username TEXT NOT NULL,
  alias TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_links_alias ON payment_links(alias);

ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for payment_links (anon)" ON payment_links FOR ALL USING (true) WITH CHECK (true);

-- 5. POINTS (Optional)
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL UNIQUE,
  total_points NUMERIC DEFAULT 0,
  lifetime_points NUMERIC DEFAULT 0,
  level INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all for user_points" ON user_points FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER balances_updated_at
  BEFORE UPDATE ON balances
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at();
