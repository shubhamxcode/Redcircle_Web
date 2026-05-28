import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const claims = pgTable("claims", {
  id: uuid("id").primaryKey().defaultRandom(),

  // Grouped by batch (one "Claim All" press = one batchId)
  claimBatchId: text("claim_batch_id").notNull(),

  // Per-pool result
  poolAddress:   text("pool_address").notNull(),
  orynthClaimId: text("orynth_claim_id"),

  // Status: preparing | signed | submitted | confirmed | failed
  status: text("status").default("preparing").notNull(),

  amountSol:    text("amount_sol"),
  signature:    text("signature"),
  errorMessage: text("error_message"),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Claim    = typeof claims.$inferSelect;
export type NewClaim = typeof claims.$inferInsert;
