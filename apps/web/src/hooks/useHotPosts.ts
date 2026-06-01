import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/auth";

export interface TokenInfo {
  postId: string;
  tokenSymbol: string | null;
  mintAddress: string | null;
  status: string;
  // tokenSymbol already present — used for URL routing
}

export interface HotPost {
  id: string;
  title: string;
  author: string;
  subreddit: string;
  redditUrl: string;
  thumbnail: string | null;
  upvotes: number;
  numComments: number;
  createdUtc: number;
  tokenInfo?: TokenInfo;
}

export interface Category {
  id: string;
  label: string;
}

export function useHotPosts(category = "all") {
  const [posts, setPosts] = useState<HotPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);

  // Fetch category list once
  useEffect(() => {
    fetch(`${getApiUrl()}/api/trending/categories`)
      .then((r) => r.json())
      .then((d: { categories: Category[] }) => setCategories(d.categories))
      .catch(() => {});
  }, []);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getApiUrl();
      const res = await fetch(`${api}/api/trending?category=${encodeURIComponent(category)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { posts?: HotPost[]; cachedAt?: string };
      const rawPosts: HotPost[] = data.posts ?? [];
      setCachedAt(data.cachedAt ? new Date(data.cachedAt).getTime() : Date.now());

      let tokenized: Record<string, TokenInfo> = {};
      if (rawPosts.length > 0) {
        try {
          const ids = rawPosts.map((p) => p.id);
          const chkRes = await fetch(`${api}/api/posts/check-tokenized`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids }),
          });
          if (chkRes.ok) {
            const chkData = (await chkRes.json()) as { tokenized: Record<string, TokenInfo> };
            tokenized = chkData.tokenized ?? {};
          }
        } catch {
          // non-fatal
        }
      }

      setPosts(rawPosts.map((p) => ({ ...p, tokenInfo: tokenized[p.id] ?? undefined })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trending posts");
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return { posts, loading, error, cachedAt, categories, refresh: fetchPosts };
}
