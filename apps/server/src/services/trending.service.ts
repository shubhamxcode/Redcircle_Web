import { RedditService, type TrendingRedditPost } from "./reddit.service";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

export const CATEGORIES: Record<string, { label: string; subreddit: string }> = {
  all:           { label: "All",           subreddit: "popular" },
  technology:    { label: "Technology",    subreddit: "technology+programming+artificial+MachineLearning+compsci+webdev" },
  sports:        { label: "Sports",        subreddit: "sports+nba+nfl+soccer+baseball+MMA+formula1+tennis" },
  crypto:        { label: "Crypto",        subreddit: "CryptoCurrency+Bitcoin+ethereum+solana+defi+NFT+CryptoMarkets" },
  politics:      { label: "Politics",      subreddit: "politics+worldnews+news+geopolitics+PoliticalDiscussion" },
  gaming:        { label: "Gaming",        subreddit: "gaming+pcgaming+nintendo+playstation+xboxone+Competitiveoverwatch" },
  entertainment: { label: "Entertainment", subreddit: "movies+television+Music+anime+books+popculturechat" },
  science:       { label: "Science",       subreddit: "science+space+biology+physics+chemistry+medicine" },
};

interface TrendingCache {
  posts: TrendingRedditPost[];
  cachedAt: number;
  nextRefreshAt: number;
}

// One cache entry per category
const caches = new Map<string, TrendingCache>();

export async function refreshTrendingCache(category = "all"): Promise<void> {
  const cat = CATEGORIES[category] ?? CATEGORIES.all;
  try {
    const posts = await RedditService.fetchHotPosts(cat.subreddit, 25);
    caches.set(category, {
      posts,
      cachedAt: Date.now(),
      nextRefreshAt: Date.now() + CACHE_TTL_MS,
    });
  } catch (error) {
    console.error(`❌ [Trending] Failed to refresh cache for "${category}":`, error);
  }
}

export function getCachedTrendingPosts(category = "all"): TrendingCache {
  return caches.get(category) ?? { posts: [], cachedAt: 0, nextRefreshAt: Date.now() };
}

export function isCacheStale(category = "all"): boolean {
  const c = caches.get(category);
  return !c || Date.now() > c.nextRefreshAt;
}
