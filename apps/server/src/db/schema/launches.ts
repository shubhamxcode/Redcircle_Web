import { pgTable, text, timestamp, integer, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { posts } from "./posts";

export const launchStatusEnum = pgEnum("launch_status", [
  "preparing",
  "awaiting_payer_signature",
  "submitting",
  "confirming",
  "confirmed",
  "failed",
]);

export const launches = pgTable("launches", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Idempotency — Orynth's externalId, stable per (post, launcher)
  externalId: text("external_id").unique().notNull(),

  // Orynth reference
  orynthLaunchId: text("orynth_launch_id").unique(),

  // Our data
  postId: uuid("post_id").references(() => posts.id),
  launcherId: uuid("launcher_id").references(() => users.id),

  // Source metadata (sent to Orynth) — generic, not tied to Reddit specifically
  sourcePlatform: text("source_platform").default("reddit").notNull(),
  sourceId:       text("source_id"),    // e.g. Reddit post ID
  sourceUrl:      text("source_url"),
  sourceTitle:    text("source_title"),

  // Creator info (the original author — may not be a registered Redcircle user yet)
  creatorPlatformUserId: text("creator_platform_user_id"),
  creatorUsername: text("creator_username"),

  // Payer wallet (who pays Solana launch costs)
  payerWalletAddress: text("payer_wallet_address").notNull(),

  // Token metadata
  tokenName: text("token_name").notNull(),
  tokenSymbol: text("token_symbol").notNull(),
  tokenDescription: text("token_description"),
  tokenImageUrl: text("token_image_url"),

  // Blockchain
  mintAddress: text("mint_address"),
  poolAddress: text("pool_address"),

  // Transaction data — poolCreator-signed tx stored here; payer adds their sig on frontend
  preparedTxHex: text("prepared_tx_hex"),
  signedTxHex: text("signed_tx_hex"),

  // Fee config from Orynth (JSON string)
  feeConfig: text("fee_config"),

  // Status & errors
  status: launchStatusEnum("status").default("preparing").notNull(),
  errorMessage: text("error_message"),

  // Creator earnings ledger (bps of trading volume)
  partnerFeeBps: integer("partner_fee_bps").default(134),  // 1.34% — full partner bucket
  creatorFeeBps: integer("creator_fee_bps").default(67),   // 0.67% — creator share
  platformFeeBps: integer("platform_fee_bps").default(67), // 0.67% — platform share

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Launch = typeof launches.$inferSelect;
export type NewLaunch = typeof launches.$inferInsert;
