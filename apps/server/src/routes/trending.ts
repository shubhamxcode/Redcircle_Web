import { Router } from "express";
import {
  getCachedTrendingPosts,
  refreshTrendingCache,
  isCacheStale,
} from "../services/trending.service";

const router = Router();

/**
 * GET /api/trending
 * Returns cached hot Reddit posts (refreshed every 3 hours by background job).
 * Falls back to an on-demand refresh if the cache is stale.
 */
router.get("/", async (_req, res) => {
  try {
    if (isCacheStale()) {
      await refreshTrendingCache();
    }

    const { posts, cachedAt, nextRefreshAt } = getCachedTrendingPosts();

    res.json({
      success: true,
      posts,
      count: posts.length,
      cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
      nextRefreshAt: new Date(nextRefreshAt).toISOString(),
    });
  } catch (error) {
    console.error("❌ Error serving trending posts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch trending posts" });
  }
});

export default router;
