import { useState, useEffect, useCallback } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
      const res = await fetch(`${API_URL}/api/trending`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { posts?: HotPost[]; cachedAt?: string };
      setPosts(data.posts ?? []);
      setCachedAt(data.cachedAt ? new Date(data.cachedAt).getTime() : Date.now());
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
