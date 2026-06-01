import { Router } from "express";
import { db } from "../db";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import * as schema from "../db";
import { getEarnings } from "../services/orynth.service";

const { launches, users } = schema;

const router = Router();

// Simple in-memory SOL price cache (5-minute TTL)
let solPriceCache: { usd: number; fetchedAt: number } | null = null;

async function getSolPriceUsd(): Promise<number> {
  const TTL = 5 * 60 * 1000;
  if (solPriceCache && Date.now() - solPriceCache.fetchedAt < TTL) {
    return solPriceCache.usd;
  }
  try {
    const res  = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd");
    const data = await res.json() as { solana?: { usd?: number } };
    const price = data?.solana?.usd ?? 0;
    if (price > 0) solPriceCache = { usd: price, fetchedAt: Date.now() };
    return price;
  } catch {
    return solPriceCache?.usd ?? 0;
  }
}

/**
 * GET /api/leaderboard
 * Returns top creators ranked by USDC earnings.
 *
 * A "creator" is the Reddit user who authored the tokenized post AND has a
 * Redcircle account (i.e. their Reddit username matches a row in `users`).
 * This is determined by joining launches.creatorUsername = users.username.
 */
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;

    // 1. Get confirmed launches that have a pool + creatorUsername.
    //    LEFT JOIN users so creators without a Redcircle account still appear;
    //    they just won't have an avatar.
    const rows = await db
      .select({
        poolAddress:     launches.poolAddress,
        creatorUsername: launches.creatorUsername,
        creatorFeeBps:   launches.creatorFeeBps,
        partnerFeeBps:   launches.partnerFeeBps,
        userId:          users.id,
        avatarUrl:       users.avatarUrl,
      })
      .from(launches)
      .leftJoin(
        users,
        sql`lower(${launches.creatorUsername}) = lower(${users.username})`,
      )
      .where(
        and(
          eq(launches.status, "confirmed"),
          isNotNull(launches.poolAddress),
          isNotNull(launches.creatorUsername),
        ),
      );

    if (rows.length === 0) {
      return res.json({ success: true, category: "author", data: [] });
    }

    // 2. Fetch SOL price and Orynth earnings in parallel
    const poolAddresses = [...new Set(rows.map((r) => r.poolAddress!))];
    const [solPrice, earningsRes] = await Promise.all([
      getSolPriceUsd(),
      getEarnings(poolAddresses),
    ]);
    const earningsMap = new Map(
      (earningsRes.earnings ?? []).map((e) => [e.poolAddress, e]),
    );

    // 3. Group by creatorUsername (userId may be null for unregistered creators)
    const creatorMap = new Map<string, {
      userId:           string | null;
      avatarUrl:        string | null;
      totalUsdcEarned:  number;
      totalVolumeUsdc:  number;
    }>();

    for (const row of rows) {
      const username   = row.creatorUsername!.toLowerCase();
      const earning    = earningsMap.get(row.poolAddress!);
      const totalUsdc  = earning
        ? parseFloat(earning.claimedUsdc  ?? "0") +
          parseFloat(earning.claimableUsdc ?? "0")
        : 0;

      const creatorBps = row.creatorFeeBps ?? 50;
      const partnerBps = row.partnerFeeBps ?? 105;
      const share      = partnerBps > 0 ? creatorBps / partnerBps : 0.5;
      const earned     = totalUsdc * share;

      // Derive trading volume in SOL:
      // partnerUsdc / feeRate = volumeUsdc, then / solPrice = volumeSol
      const volumeUsdc = partnerBps > 0 ? totalUsdc / (partnerBps / 10000) : 0;
      const tradingVolume = solPrice > 0 ? volumeUsdc / solPrice : 0;

      const existing = creatorMap.get(username);
      if (existing) {
        existing.totalUsdcEarned += earned;
        existing.totalVolumeUsdc += tradingVolume;
        if (!existing.userId && row.userId) {
          existing.userId    = row.userId;
          existing.avatarUrl = row.avatarUrl;
        }
      } else {
        creatorMap.set(username, {
          userId:           row.userId,
          avatarUrl:        row.avatarUrl,
          totalUsdcEarned:  earned,
          totalVolumeUsdc:  tradingVolume,
        });
      }
    }

    // 4. Sort by earnings descending
    const data = Array.from(creatorMap.entries())
      .sort(([, a], [, b]) => b.totalUsdcEarned - a.totalUsdcEarned)
      .slice(0, limit)
      .map(([username, c], index) => ({
        rank:     index + 1,
        id:       c.userId ?? username,
        user:     username,
        avatar:   c.avatarUrl,
        pnl:      parseFloat(c.totalUsdcEarned.toFixed(4)),
        volume:   parseFloat(c.totalVolumeUsdc.toFixed(2)),
        category: "author" as const,
      }));

    return res.json({ success: true, category: "author", data });
  } catch (error) {
    console.error("❌ Error fetching leaderboard:", error);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch leaderboard data",
    });
  }
});

export default router;
