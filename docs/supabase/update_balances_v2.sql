-- Adds separate columns for Base (ETH/USDC) and Sepolia (ETH)

ALTER TABLE balances 
ADD COLUMN IF NOT EXISTS eth_balance NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS usdc_balance NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS sepolia_eth_balance NUMERIC NOT NULL DEFAULT 0;

-- Safer migration: only if available_balance column exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='balances' AND column_name='available_balance') THEN
        UPDATE balances SET eth_balance = available_balance WHERE eth_balance = 0 AND available_balance > 0;
    END IF;
END $$;
