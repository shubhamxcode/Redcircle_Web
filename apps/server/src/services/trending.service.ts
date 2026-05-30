import { RedditService, type TrendingRedditPost } from "./reddit.service";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

interface TrendingCache {
  posts: TrendingRedditPost[];
  cachedAt: number;
  nextRefreshAt: number;
}

let cache: TrendingCache | null = null;

export async function refreshTrendingCache(): Promise<void> {
  console.log("🔥 [Trending] Refreshing trending posts cache…");
  try {
    const posts = await RedditService.fetchHotPosts("popular", 25);
    cache = {
      posts,
      cachedAt: Date.now(),
      nextRefreshAt: Date.now() + CACHE_TTL_MS,
    };
    console.log(`✅ [Trending] Cached ${posts.length} trending posts`);
  } catch (error) {
    console.error("❌ [Trending] Failed to refresh cache:", error);
    // Keep stale cache if refresh fails rather than serving empty
  }
}

export function getCachedTrendingPosts(): TrendingCache {
  return cache ?? { posts: [], cachedAt: 0, nextRefreshAt: Date.now() };
}

export function isCacheStale(): boolean {
  return !cache || Date.now() > cache.nextRefreshAt;
}
