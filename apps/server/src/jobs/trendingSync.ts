import { refreshTrendingCache } from "../services/trending.service";

const SYNC_INTERVAL_MS = 3 * 60 * 60 * 1000; // 3 hours

export function startTrendingSyncJob(): void {
  refreshTrendingCache().catch((err) =>
    console.error("❌ [TrendingSync] Initial fetch failed:", err),
  );

  setInterval(() => {
    refreshTrendingCache().catch((err) =>
      console.error("❌ [TrendingSync] Refresh failed:", err),
    );
  }, SYNC_INTERVAL_MS);

  console.log(
    `🚀 [TrendingSync] Job started — refreshing every ${SYNC_INTERVAL_MS / (60 * 60 * 1000)}h`,
  );
}
