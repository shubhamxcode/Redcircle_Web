import { PublicKey } from "@solana/web3.js";
import { db } from "../db";
import * as schema from "../db";
import { eq } from "drizzle-orm";
import {
  buildRedCircleTradeTransaction,
  getCuratorForTrade,
  getRedCirclePoolSummary,
  quoteRedCircleTrade,
  type TradeSide,
} from "./redcircle-protocol.service.js";

const { posts, users } = schema;

type BuyTokenParams = {
  postId: string;
  buyerWalletAddress: string;
  amountInSOL: number;
  slippageBps?: number;
};

type SellTokenParams = {
  postId: string;
  sellerWalletAddress: string;
  amountInTokens: number;
  slippageBps?: number;
};

function protocolPostIdFor(post: typeof posts.$inferSelect) {
  return post.redCirclePostId || post.redditPostId;
}

async function getPostWithCreator(postId: string) {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error("Post not found");

  const [creator] = await db
    .select()
    .from(users)
    .where(eq(users.id, post.creatorId))
    .limit(1);

  return { post, creator };
}

function assertRedCirclePool(post: typeof posts.$inferSelect) {
  if (!post.redCirclePoolAddress) {
    throw new Error("RedCircle pool not created for this post.");
  }
}

export async function buyTokens(params: BuyTokenParams) {
  const { postId, buyerWalletAddress, amountInSOL, slippageBps } = params;
  const { post, creator } = await getPostWithCreator(postId);
  assertRedCirclePool(post);

  const protocolPostId = protocolPostIdFor(post);
  const buyer = new PublicKey(buyerWalletAddress);
  const curator = await getCuratorForTrade(creator?.walletAddress);
  const result = await buildRedCircleTradeTransaction({
    protocolPostId,
    user: buyer,
    curator,
    side: "buy",
    amount: amountInSOL,
    slippageBps,
  });

  return {
    success: true,
    transaction: result.transaction,
    versioned: true,
    quote: result.quote,
    pool: result.pool,
    tokenMint: result.tokenMint,
  };
}

export async function sellTokens(params: SellTokenParams) {
  const { postId, sellerWalletAddress, amountInTokens, slippageBps } = params;
  const { post, creator } = await getPostWithCreator(postId);
  assertRedCirclePool(post);

  const protocolPostId = protocolPostIdFor(post);
  const seller = new PublicKey(sellerWalletAddress);
  const curator = await getCuratorForTrade(creator?.walletAddress);
  const result = await buildRedCircleTradeTransaction({
    protocolPostId,
    user: seller,
    curator,
    side: "sell",
    amount: amountInTokens,
    slippageBps,
  });

  return {
    success: true,
    transaction: result.transaction,
    versioned: true,
    quote: result.quote,
    pool: result.pool,
    tokenMint: result.tokenMint,
  };
}

export async function quoteTrade(params: {
  postId: string;
  side: TradeSide;
  amount: number;
  slippageBps?: number;
}) {
  const { post } = await getPostWithCreator(params.postId);
  assertRedCirclePool(post);
  return quoteRedCircleTrade(
    protocolPostIdFor(post),
    params.side,
    params.amount,
    params.slippageBps
  );
}

export async function getTradingStats(postId: string) {
  const { post } = await getPostWithCreator(postId);

  if (!post.redCirclePoolAddress) {
    return {
      currentPrice: parseFloat(post.currentPrice),
      totalSupply: post.tokenSupply,
      soldSupply: 0,
      availableSupply: post.tokenSupply,
      totalVolume: parseFloat(post.totalVolume),
      marketCap: parseFloat(post.marketCap),
      holders: post.holders,
      poolStatus: "pending",
      poolModel: "none",
      tokenBalance: 0,
      solBalance: 0,
      totalFees: 0,
      fees: {
        creator: 0,
        curator: 0,
        growth: 0,
        platform: 0,
        unclaimedCreator: 0,
        unclaimedCurator: 0,
        unclaimedGrowth: 0,
      },
    };
  }

  const summary = await getRedCirclePoolSummary(protocolPostIdFor(post));

  return {
    currentPrice: summary.currentPrice,
    totalSupply: summary.tokenSupply,
    soldSupply: summary.tokensSold,
    availableSupply: summary.availableSupply,
    totalVolume: summary.totalVolume,
    marketCap: summary.currentPrice * summary.tokenSupply,
    holders: post.holders,
    poolStatus: summary.status,
    poolModel: summary.model,
    pool: summary.pool,
    marketState: summary.marketState,
    tokenMint: summary.tokenMint,
    solReserve: summary.solReserve,
    tokenReserve: summary.tokenReserve,
    totalFees: summary.totalFees,
    totalTrades: summary.totalTrades,
    launchProtectionEndsAt: summary.launchProtectionEndsAt,
    maxBuyDuringProtection: summary.maxBuyDuringProtection,
    fees: summary.fees,
  };
}
