import { index, numeric, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { posts } from "./posts";

export const redCircleTrades = pgTable(
  "redcircle_trades",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    signature: text("signature").notNull().unique(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    protocolPostId: text("protocol_post_id").notNull(),
    pool: text("pool").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
    side: text("side").notNull(),
    amountIn: numeric("amount_in", { precision: 36, scale: 9 }).notNull(),
    amountOut: numeric("amount_out", { precision: 36, scale: 9 }).notNull(),
    priceLamportsPerToken: numeric("price_lamports_per_token", {
      precision: 36,
      scale: 0,
    }).notNull(),
    volumeLamports: numeric("volume_lamports", { precision: 36, scale: 0 }).notNull(),
    totalFee: numeric("total_fee", { precision: 36, scale: 9 }).notNull(),
    creatorFee: numeric("creator_fee", { precision: 36, scale: 9 }).notNull(),
    curatorFee: numeric("curator_fee", { precision: 36, scale: 9 }).notNull(),
    platformFee: numeric("platform_fee", { precision: 36, scale: 9 }).notNull(),
    growthFee: numeric("growth_fee", { precision: 36, scale: 9 }).notNull(),
    tokensSold: numeric("tokens_sold", { precision: 36, scale: 9 }).notNull(),
    solReserve: numeric("sol_reserve", { precision: 36, scale: 9 }).notNull(),
    tokenReserve: numeric("token_reserve", { precision: 36, scale: 9 }).notNull(),
  },
  (table) => [
    index("redcircle_trades_pool_idx").on(table.pool),
    index("redcircle_trades_post_time_idx").on(table.postId, table.timestamp),
  ]
);

export const redCircleCandles = pgTable(
  "redcircle_candles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pool: text("pool").notNull(),
    postId: uuid("post_id").references(() => posts.id, { onDelete: "cascade" }),
    timeframe: text("timeframe").notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    open: numeric("open", { precision: 36, scale: 9 }).notNull(),
    high: numeric("high", { precision: 36, scale: 9 }).notNull(),
    low: numeric("low", { precision: 36, scale: 9 }).notNull(),
    close: numeric("close", { precision: 36, scale: 9 }).notNull(),
    volume: numeric("volume", { precision: 36, scale: 9 }).notNull(),
  },
  (table) => [
    index("redcircle_candles_pool_tf_time_idx").on(
      table.pool,
      table.timeframe,
      table.timestamp
    ),
  ]
);

export type RedCircleTrade = typeof redCircleTrades.$inferSelect;
export type NewRedCircleTrade = typeof redCircleTrades.$inferInsert;
export type RedCircleCandle = typeof redCircleCandles.$inferSelect;
export type NewRedCircleCandle = typeof redCircleCandles.$inferInsert;
