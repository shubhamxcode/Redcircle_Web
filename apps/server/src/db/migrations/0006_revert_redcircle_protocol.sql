DROP TABLE IF EXISTS "redcircle_candles" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "redcircle_trades" CASCADE;--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_redcircle_post_id_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_redcircle_pool_address_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_redcircle_market_state_address_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_redcircle_pool_sol_vault_address_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP CONSTRAINT IF EXISTS "posts_redcircle_pool_token_vault_address_unique";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "redcircle_post_id";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "redcircle_pool_address";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "redcircle_market_state_address";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "redcircle_pool_sol_vault_address";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "redcircle_pool_token_vault_address";--> statement-breakpoint
ALTER TABLE "posts" DROP COLUMN IF EXISTS "redcircle_config_address";
