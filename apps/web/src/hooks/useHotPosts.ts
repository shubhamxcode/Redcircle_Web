import { useState, useEffect, useCallback } from "react";
import { getApiUrl } from "@/lib/auth";

export interface TokenInfo {
  postId: string;
  tokenSymbol: string | null;
  mintAddress: string | null;
  status: string;
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

export function useHotPosts() {
  const [posts, setPosts] = useState<HotPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<number | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = getApiUrl();
      const res = await fetch(`${api}/api/trending`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { posts?: HotPost[]; cachedAt?: string };
      const rawPosts: HotPost[] = data.posts ?? [];
      setCachedAt(data.cachedAt ? new Date(data.cachedAt).getTime() : Date.now());

      // Check which posts have already been tokenized on the platform
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
          // Non-fatal — continue without tokenization info
        }
      }

      setPosts(rawPosts.map((p) => ({
        ...p,
        tokenInfo: tokenized[p.id] ?? undefined,
      })));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trending posts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  return {
    posts,
    loading,
    error,
    cachedAt,
    refresh: fetchPosts,
  };
}
