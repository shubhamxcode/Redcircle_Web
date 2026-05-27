import { db, posts } from "../db";
import { eq, isNotNull, and } from "drizzle-orm";

const DEXSCREENER_BASE = "https://api.dexscreener.com/latest/dex/tokens";
const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const REQUEST_DELAY_MS = 600; // be polite to the free API

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

type DexPair = {
  priceUsd?: string;
  marketCap?: number;
  fdv?: number;
  volume?: { h24?: number };
  liquidity?: { usd?: number };
};

async function fetchBestPair(mintAddress: string): Promise<DexPair | null> {
  try {
    const res = await fetch(`${DEXSCREENER_BASE}/${mintAddress}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;

    const data = await res.json() as { pairs?: DexPair[] };
    if (!data.pairs?.length) return null;

    return data.pairs.sort(
      (a, b) => (b.liquidity?.usd ?? 0) - (a.liquidity?.usd ?? 0),
    )[0] ?? null;
  } catch {
    return null;
  }
}

async function runSync() {
  const activePosts = await db
    .select({ id: posts.id, tokenMintAddress: posts.tokenMintAddress })
    .from(posts)
    .where(and(eq(posts.status, "active"), isNotNull(posts.tokenMintAddress)));

  if (!activePosts.length) return;

  console.log(`🔄 [PriceSync] Syncing ${activePosts.length} token(s)…`);

  let updated = 0;

  for (const post of activePosts) {
    if (!post.tokenMintAddress) continue;

    const pair = await fetchBestPair(post.tokenMintAddress);
    if (!pair) {
      await sleep(REQUEST_DELAY_MS);
      continue;
    }

    const mcap = pair.marketCap ?? pair.fdv;
    const volume = pair.volume?.h24;
    const price = pair.priceUsd;

    // Only update fields that came back from DexScreener
    const updates: Partial<typeof posts.$inferInsert> = {
      updatedAt: new Date(),
    };
    if (mcap != null) updates.marketCap = String(mcap);
    if (volume != null) updates.totalVolume = String(volume);
    if (price != null) updates.currentPrice = String(price);

    await db.update(posts).set(updates).where(eq(posts.id, post.id));
    updated++;

    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`✅ [PriceSync] Updated ${updated}/${activePosts.length} token(s)`);
}

export function startPriceSyncJob() {
  // Run once immediately at startup
  runSync().catch((err) =>
    console.error("❌ [PriceSync] Initial sync failed:", err),
  );

  // Then every 5 minutes
  setInterval(() => {
    runSync().catch((err) =>
      console.error("❌ [PriceSync] Sync failed:", err),
    );
  }, SYNC_INTERVAL_MS);

  console.log(`🚀 [PriceSync] Job started — syncing every ${SYNC_INTERVAL_MS / 60_000}min`);
}
