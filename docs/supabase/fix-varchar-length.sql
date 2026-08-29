-- =============================================================================
-- Fix: "value too long for type character varying(42)" when creating payment link
-- Aleo wallet addresses are ~59 chars; columns must allow longer strings.
-- Run this in Supabase Dashboard → SQL Editor.
-- =============================================================================

-- payment_links: ensure wallet_address, username, alias can hold long values
ALTER TABLE payment_links
  ALTER COLUMN wallet_address TYPE TEXT,
  ALTER COLUMN username TYPE TEXT,
  ALTER COLUMN alias TYPE TEXT;

-- users: ensure wallet_address and username can hold long values
ALTER TABLE users
  ALTER COLUMN wallet_address TYPE TEXT,
  ALTER COLUMN username TYPE TEXT;

-- balances: ensure username and wallet_address can hold long values
ALTER TABLE balances
  ALTER COLUMN username TYPE TEXT,
  ALTER COLUMN wallet_address TYPE TEXT;

-- payments: ensure sender_address and recipient_username can hold long values
ALTER TABLE payments
  ALTER COLUMN sender_address TYPE TEXT,
  ALTER COLUMN recipient_username TYPE TEXT;
