import { pgTable, text, timestamp, integer, numeric, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";

// Enum for tokenization status
export const tokenizationStatusEnum = pgEnum("tokenization_status", [
  "pending",    // Post submitted, awaiting token creation
  "minting",    // Token minting in progress
  "active",     // Token minted and active for trading
  "failed",     // Token minting failed
  "delisted",   // Token removed from trading
]);

export const posts = pgTable("posts", {
  id: uuid("id").primaryKey().defaultRandom(),
  
  // Reddit Post Info
  redditPostId: text("reddit_post_id").unique().notNull(), // Reddit's unique post ID
  redditUrl: text("reddit_url").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(), // Reddit username of original poster
  subreddit: text("subreddit").notNull(),
  thumbnail: text("thumbnail"),
  content: text("content"), // Post body/selftext if available
  
  // Reddit Metrics (snapshot at tokenization time)
  upvotes: integer("upvotes").default(0).notNull(),
  comments: integer("comments").default(0).notNull(),
  redditCreatedAt: timestamp("reddit_created_at", { withTimezone: true }),
  
  // Token Configuration
  tokenSupply: integer("token_supply").notNull(), // Total tokens minted
  initialPrice: numeric("initial_price", { precision: 18, scale: 9 }).notNull(), // In SOL
  currentPrice: numeric("current_price", { precision: 18, scale: 9 }).notNull(), // Current market price
  description: text("description"), // Optional curator description
  
  // Blockchain Info
  tokenMintAddress: text("token_mint_address").unique(), // Solana token mint address
  tokenSymbol: text("token_symbol"), // e.g., "POST123"
  tokenSlug: text("token_slug").unique(), // e.g. "fade-a3f2b1" — used for canonical URL
  tokenDecimals: integer("token_decimals").default(9), // Standard SPL token decimals

  // Tokenization Status
  status: tokenizationStatusEnum("status").default("pending").notNull(),
  
  // Trading Metrics
  totalVolume: numeric("total_volume", { precision: 18, scale: 9 }).default("0").notNull(), // Total trading volume in SOL
  marketCap: numeric("market_cap", { precision: 18, scale: 9 }).default("0").notNull(), // Current market cap
  holders: integer("holders").default(0).notNull(), // Number of unique token holders
  
  // Creator/Curator Info
  creatorId: uuid("creator_id").references(() => users.id), // null for wallet-only launches
  creatorRewards: numeric("creator_rewards", { precision: 18, scale: 9 }).default("0").notNull(),
  curatorRewards: numeric("curator_rewards", { precision: 18, scale: 9 }).default("0").notNull(),
  
  // Metadata
  tags: text("tags").array(), // Optional tags for categorization
  featured: integer("featured").default(0).notNull(), // Featured/boosted posts (higher = more prominent)
  
  // Timestamps
  tokenizedAt: timestamp("tokenized_at", { withTimezone: true }).defaultNow().notNull(),
  mintedAt: timestamp("minted_at", { withTimezone: true }), // When token was actually minted
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
