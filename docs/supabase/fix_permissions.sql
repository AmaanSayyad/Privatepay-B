-- =============================================================================
-- Fix Supabase Permissions (RLS)
-- Run this in the Supabase SQL Editor if you get 401 / Permission Denied errors
-- =============================================================================

-- 1. USERS Table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for users (anon)" ON users;
CREATE POLICY "Allow all for users (anon)" ON users FOR ALL USING (true) WITH CHECK (true);

-- 2. BALANCES Table
ALTER TABLE balances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for balances (anon)" ON balances;
CREATE POLICY "Allow all for balances (anon)" ON balances FOR ALL USING (true) WITH CHECK (true);

-- 3. PAYMENTS Table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for payments (anon)" ON payments;
CREATE POLICY "Allow all for payments (anon)" ON payments FOR ALL USING (true) WITH CHECK (true);

-- 4. PAYMENT_LINKS Table
ALTER TABLE payment_links ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for payment_links (anon)" ON payment_links;
CREATE POLICY "Allow all for payment_links (anon)" ON payment_links FOR ALL USING (true) WITH CHECK (true);

-- 5. BITGO_ADDRESSES Table
ALTER TABLE bitgo_addresses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for bitgo_addresses (anon)" ON bitgo_addresses;
CREATE POLICY "Allow all for bitgo_addresses (anon)" ON bitgo_addresses FOR ALL USING (true) WITH CHECK (true);

-- IMPORTANT: Ensure the 'anon' role has the right to use the sequences and tables
GRANT ALL ON TABLE users TO anon, authenticated, service_role;
GRANT ALL ON TABLE balances TO anon, authenticated, service_role;
GRANT ALL ON TABLE payments TO anon, authenticated, service_role;
GRANT ALL ON TABLE payment_links TO anon, authenticated, service_role;
GRANT ALL ON TABLE bitgo_addresses TO anon, authenticated, service_role;
