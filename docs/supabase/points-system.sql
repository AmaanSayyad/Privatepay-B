-- =============================================================================
-- PrivatePay (Aleo) – Points & Rewards System
-- Run in Supabase Dashboard → SQL Editor (after main schema.sql)
-- Uses TEXT for wallet_address (Aleo addresses can be long)
-- =============================================================================

-- User points (by Aleo wallet address)
CREATE TABLE IF NOT EXISTS user_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT UNIQUE NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  lifetime_points INTEGER DEFAULT 0 NOT NULL,
  level INTEGER DEFAULT 1 NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_points_wallet ON user_points(wallet_address);

-- Point transactions (history)
CREATE TABLE IF NOT EXISTS point_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  points INTEGER NOT NULL,
  transaction_type VARCHAR(50) NOT NULL,
  description TEXT,
  related_payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
  related_payment_link_id UUID REFERENCES payment_links(id) ON DELETE SET NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_point_transactions_wallet ON point_transactions(wallet_address);
CREATE INDEX IF NOT EXISTS idx_point_transactions_created ON point_transactions(created_at DESC);

-- Points config (action type → points value)
CREATE TABLE IF NOT EXISTS points_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50) UNIQUE NOT NULL,
  points_value INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO points_config (action_type, points_value, description) VALUES
  ('payment_sent', 10, 'Points for sending a payment'),
  ('payment_received', 15, 'Points for receiving a payment'),
  ('payment_link_created', 5, 'Points for creating a payment link'),
  ('first_payment', 50, 'Bonus for first payment sent'),
  ('first_received', 50, 'Bonus for first payment received'),
  ('daily_login', 2, 'Points for daily login'),
  ('referral_signup', 100, 'Points for referring a new user')
ON CONFLICT (action_type) DO NOTHING;

-- Level from lifetime points: level = floor(lifetime/100) + 1
CREATE OR REPLACE FUNCTION calculate_user_level(lifetime_points INTEGER)
RETURNS INTEGER AS $$
BEGIN
  RETURN GREATEST(1, FLOOR(lifetime_points / 100)::INTEGER + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Award points (called from app or RPC)
CREATE OR REPLACE FUNCTION award_points(
  p_wallet_address TEXT,
  p_action_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_related_payment_id UUID DEFAULT NULL,
  p_related_payment_link_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_points_value INTEGER;
  v_lifetime_points INTEGER;
  v_new_level INTEGER;
BEGIN
  SELECT points_value INTO v_points_value
  FROM points_config
  WHERE action_type = p_action_type AND is_active = true;

  IF v_points_value IS NULL OR v_points_value = 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO user_points (wallet_address, total_points, lifetime_points)
  VALUES (p_wallet_address, v_points_value, v_points_value)
  ON CONFLICT (wallet_address) DO UPDATE
  SET
    total_points = user_points.total_points + v_points_value,
    lifetime_points = user_points.lifetime_points + v_points_value,
    updated_at = NOW()
  RETURNING lifetime_points INTO v_lifetime_points;

  v_new_level := calculate_user_level(v_lifetime_points);

  UPDATE user_points
  SET level = v_new_level
  WHERE wallet_address = p_wallet_address AND level < v_new_level;

  INSERT INTO point_transactions (
    wallet_address, points, transaction_type, description,
    related_payment_id, related_payment_link_id, metadata
  ) VALUES (
    p_wallet_address, v_points_value, p_action_type,
    COALESCE(p_description, (SELECT description FROM points_config WHERE action_type = p_action_type)),
    p_related_payment_id, p_related_payment_link_id, p_metadata
  );

  RETURN v_points_value;
END;
$$ LANGUAGE plpgsql;

-- RLS
ALTER TABLE user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all user_points" ON user_points;
CREATE POLICY "Allow all user_points" ON user_points FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all point_transactions" ON point_transactions;
CREATE POLICY "Allow all point_transactions" ON point_transactions FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read points_config" ON points_config;
CREATE POLICY "Allow read points_config" ON points_config FOR SELECT USING (is_active = true);

-- Allow app (anon/authenticated) to call award_points RPC
GRANT EXECUTE ON FUNCTION award_points(TEXT, VARCHAR(50), TEXT, UUID, UUID, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION award_points(TEXT, VARCHAR(50), TEXT, UUID, UUID, JSONB) TO authenticated;
