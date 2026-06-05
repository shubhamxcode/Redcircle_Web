-- Add curator reward tracking to posts
ALTER TABLE "posts"
  ADD COLUMN IF NOT EXISTS "curator_rewards" numeric(18, 9) NOT NULL DEFAULT '0';

-- Add curator fee config and wallet to launches
-- curator_fee_bps: no backfill default so old rows get NULL (no curator wallet = no curator earnings)
ALTER TABLE "launches"
  ADD COLUMN IF NOT EXISTS "curator_fee_bps"        integer,
  ADD COLUMN IF NOT EXISTS "curator_wallet_address"  text;
ALTER TABLE "launches" ALTER COLUMN "curator_fee_bps" SET DEFAULT 15;

-- Update default fee splits to new 2% model
-- (existing rows keep their stored values; defaults apply to new launches)
ALTER TABLE "launches"
  ALTER COLUMN "creator_fee_bps"  SET DEFAULT 40,
  ALTER COLUMN "platform_fee_bps" SET DEFAULT 50;
