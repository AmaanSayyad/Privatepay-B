-- ENS Integration SQL
-- Adds ENS support to the PrivatePay users table

-- Add ens_name and ens_avatar columns to users
ALTER TABLE IF EXISTS users 
ADD COLUMN IF NOT EXISTS ens_name TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS ens_avatar TEXT,
ADD COLUMN IF NOT EXISTS ens_text_records JSONB DEFAULT '{}';

-- Create a view for users with ENS names for easier querying
CREATE OR REPLACE VIEW ens_profiles AS
SELECT 
    id,
    wallet_address,
    username,
    ens_name,
    ens_avatar,
    ens_text_records
FROM users
WHERE ens_name IS NOT NULL;

-- Index for faster lookups by ENS name
CREATE INDEX IF NOT EXISTS idx_users_ens_name ON users(ens_name);

-- Update RLS policies to allow updating ENS fields
-- Assuming we already have a policy for users to update their own row
-- If not, we ensure it exists:
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
    ) THEN
        CREATE POLICY "Users can update their own profile" 
        ON users FOR UPDATE 
        USING (auth.uid()::text = wallet_address)
        WITH CHECK (auth.uid()::text = wallet_address);
    END IF;
END
$$;
