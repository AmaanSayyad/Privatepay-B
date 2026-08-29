-- =============================================================================
-- Fix: Add missing 'username' column to payment_links
-- Error: PGRST204 "Could not find the 'username' column of 'payment_links'"
-- Run this in Supabase Dashboard → SQL Editor if you get that error.
-- =============================================================================

-- Add username column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'payment_links'
      AND column_name = 'username'
  ) THEN
    ALTER TABLE payment_links ADD COLUMN username TEXT;
    -- Backfill: set username from wallet_address (you can update manually later)
    UPDATE payment_links
    SET username = COALESCE(
      (SELECT u.username FROM users u WHERE u.wallet_address = payment_links.wallet_address LIMIT 1),
      'user'
    )
    WHERE username IS NULL;
    ALTER TABLE payment_links ALTER COLUMN username SET NOT NULL;
  END IF;
END $$;
