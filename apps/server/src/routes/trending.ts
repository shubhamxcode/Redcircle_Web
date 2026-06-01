import { Router } from "express";
import {
  CATEGORIES,
  getCachedTrendingPosts,
  refreshTrendingCache,
  isCacheStale,
} from "../services/trending.service";

const router = Router();

router.get("/", async (req, res) => {
  try {
    const category = typeof req.query.category === "string" && CATEGORIES[req.query.category]
      ? req.query.category
      : "all";

    if (isCacheStale(category)) {
      await refreshTrendingCache(category);
    }

    const { posts, cachedAt, nextRefreshAt } = getCachedTrendingPosts(category);

    res.json({
      success: true,
      posts,
      category,
      count: posts.length,
      cachedAt: cachedAt ? new Date(cachedAt).toISOString() : null,
      nextRefreshAt: new Date(nextRefreshAt).toISOString(),
    });
  } catch (error) {
    console.error("❌ Error serving trending posts:", error);
    res.status(500).json({ success: false, error: "Failed to fetch trending posts" });
  }
});

// Expose category list so the client doesn't need to hardcode them
router.get("/categories", (_req, res) => {
  res.json({
    categories: Object.entries(CATEGORIES).map(([id, { label }]) => ({ id, label })),
  });
});

export default router;
