ALTER TABLE "posts" ADD COLUMN "redcircle_post_id" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "redcircle_pool_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "redcircle_market_state_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "redcircle_pool_sol_vault_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "redcircle_pool_token_vault_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN "redcircle_config_address" text;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_redcircle_post_id_unique" UNIQUE("redcircle_post_id");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_redcircle_pool_address_unique" UNIQUE("redcircle_pool_address");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_redcircle_market_state_address_unique" UNIQUE("redcircle_market_state_address");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_redcircle_pool_sol_vault_address_unique" UNIQUE("redcircle_pool_sol_vault_address");--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_redcircle_pool_token_vault_address_unique" UNIQUE("redcircle_pool_token_vault_address");--> statement-breakpoint

CREATE TABLE "redcircle_trades" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signature" text NOT NULL,
	"post_id" uuid,
	"protocol_post_id" text NOT NULL,
	"pool" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"side" text NOT NULL,
	"amount_in" numeric(36, 9) NOT NULL,
	"amount_out" numeric(36, 9) NOT NULL,
	"price_lamports_per_token" numeric(36, 0) NOT NULL,
	"volume_lamports" numeric(36, 0) NOT NULL,
	"total_fee" numeric(36, 9) NOT NULL,
	"creator_fee" numeric(36, 9) NOT NULL,
	"curator_fee" numeric(36, 9) NOT NULL,
	"platform_fee" numeric(36, 9) NOT NULL,
	"growth_fee" numeric(36, 9) NOT NULL,
	"tokens_sold" numeric(36, 9) NOT NULL,
	"sol_reserve" numeric(36, 9) NOT NULL,
	"token_reserve" numeric(36, 9) NOT NULL,
	CONSTRAINT "redcircle_trades_signature_unique" UNIQUE("signature")
);
--> statement-breakpoint
CREATE TABLE "redcircle_candles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pool" text NOT NULL,
	"post_id" uuid,
	"timeframe" text NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"open" numeric(36, 9) NOT NULL,
	"high" numeric(36, 9) NOT NULL,
	"low" numeric(36, 9) NOT NULL,
	"close" numeric(36, 9) NOT NULL,
	"volume" numeric(36, 9) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "redcircle_trades" ADD CONSTRAINT "redcircle_trades_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "redcircle_candles" ADD CONSTRAINT "redcircle_candles_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "redcircle_trades_pool_idx" ON "redcircle_trades" USING btree ("pool");--> statement-breakpoint
CREATE INDEX "redcircle_trades_post_time_idx" ON "redcircle_trades" USING btree ("post_id","timestamp");--> statement-breakpoint
CREATE INDEX "redcircle_candles_pool_tf_time_idx" ON "redcircle_candles" USING btree ("pool","timeframe","timestamp");
