-- Add settlement fields to launches
ALTER TABLE "launches"
  ADD COLUMN IF NOT EXISTS "launch_signature"          text,
  ADD COLUMN IF NOT EXISTS "partner_fee_wallet_address" text,
  ADD COLUMN IF NOT EXISTS "submitted_at"              timestamptz,
  ADD COLUMN IF NOT EXISTS "launched_at"               timestamptz;

-- Claims table for partner earnings withdrawals
CREATE TABLE IF NOT EXISTS "claims" (
  "id"              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "claim_batch_id"  text        NOT NULL,
  "pool_address"    text        NOT NULL,
  "orynth_claim_id" text,
  "status"          text        NOT NULL DEFAULT 'preparing',
  "amount_sol"      text,
  "signature"       text,
  "error_message"   text,
  "created_at"      timestamptz NOT NULL DEFAULT now(),
  "updated_at"      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "claims_batch_idx" ON "claims" ("claim_batch_id");
CREATE INDEX IF NOT EXISTS "claims_pool_idx"  ON "claims" ("pool_address");
