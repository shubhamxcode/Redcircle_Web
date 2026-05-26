import { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import { RefreshCw } from "lucide-react";
import FeedCard, { type FeedPost } from "@/components/FeedCard";
import SearchBar, { type SearchFilters } from "@/components/SearchBar";
import { getApiUrl } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

// Backend post type (matches database schema)
type BackendPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  tokenizedAt: string;
  redditCreatedAt?: string;
  thumbnail?: string; // Database field name
  tags?: string[];
  currentPrice?: string;
  marketCap?: string;
  totalVolume?: string; // Database field name
  featured: number;
  tokenSymbol?: string;
  initialPrice?: string;
  status?: string;
  tokenMintAddress?: string;
  redditUrl?: string;
  tokenSupply?: number | string;
  holders?: number;
};

export default function RedditFeed({ sideFilters = false }: { sideFilters?: boolean }) {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [isSearching, setIsSearching] = useState(false);
  const [activeSort, setActiveSort] = useState<"trending" | "new">("trending");

  // Fetch posts from backend
  const fetchPosts = useCallback(async (showRefreshing = false, resetOffset = true, filters: SearchFilters = {}, currentOffset = 0) => {
      try {
        if (showRefreshing) {
          setIsRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);
        
        const useOffset = resetOffset ? 0 : currentOffset;
        
        const apiUrl = getApiUrl();
        
        // Build URL based on whether we're searching or browsing
        const hasSearchParams = filters.q || filters.subreddit || filters.author || filters.minPrice || filters.maxPrice || filters.minVolume || filters.minMarketCap || filters.tags;
        let url = hasSearchParams 
          ? `${apiUrl}/api/posts/search?`
          : `${apiUrl}/api/posts?status=all&`;
        
        // Add pagination
        url += `limit=20&offset=${useOffset}`;
        
        // Add filters
        if (filters.q) url += `&q=${encodeURIComponent(filters.q)}`;
        if (filters.subreddit) url += `&subreddit=${encodeURIComponent(filters.subreddit)}`;
        if (filters.author) url += `&author=${encodeURIComponent(filters.author)}`;
        if (filters.minPrice) url += `&minPrice=${filters.minPrice}`;
        if (filters.maxPrice) url += `&maxPrice=${filters.maxPrice}`;
        if (filters.minVolume) url += `&minVolume=${filters.minVolume}`;
        if (filters.minMarketCap) url += `&minMarketCap=${filters.minMarketCap}`;
        if (filters.tags) url += `&tags=${encodeURIComponent(filters.tags)}`;
        if (filters.sortBy) url += `&sortBy=${filters.sortBy}`;
        
        // Fetch posts with filters
        const response = await fetch(url);
        
        if (!response.ok) {
          throw new Error("Failed to fetch posts");
        }
        
        const data = await response.json();
        
        console.log("📦 Fetched posts from backend:", data.posts?.length || 0);
        console.log("📄 Pagination:", data.pagination);
        console.log("🔄 Has more:", data.hasMore);
        
        // Transform backend data to FeedPost format
        const transformedPosts: FeedPost[] = (data.posts || []).map((post: BackendPost) => ({
          id: post.id,
          title: post.title,
          subreddit: post.subreddit,
          author: post.author,
          upvotes: post.upvotes || 0,
          comments: post.comments || 0,
          createdAt: post.tokenizedAt,
          imageUrl: post.thumbnail || undefined,
          flair: post.tags && post.tags.length > 0 ? post.tags[0] : undefined,
          tokenPrice: post.currentPrice ? parseFloat(post.currentPrice) : undefined,
          marketCap: post.marketCap ? parseFloat(post.marketCap) : undefined,
          volume24h: post.totalVolume ? parseFloat(post.totalVolume) : undefined,
          isTrending: post.featured > 0,
          tokenSymbol: post.tokenSymbol,
          initialPrice: post.initialPrice,
          status: post.status,
          tokenMintAddress: post.tokenMintAddress,
          redditUrl: post.redditUrl,
          totalSupply: post.tokenSupply ? Number(post.tokenSupply) : undefined,
          holders: post.holders || 0,
        }));
        
        console.log("✅ Transformed posts:", transformedPosts.length);
        
        // Update posts based on whether we're resetting or appending
        if (resetOffset) {
          setPosts(transformedPosts);
          setOffset(transformedPosts.length);
        } else {
          setPosts((prev) => [...prev, ...transformedPosts]);
          setOffset((prev) => prev + transformedPosts.length);
        }
        
        // Update hasMore flag
        setHasMore(data.hasMore || false);
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError(err instanceof Error ? err.message : "Failed to load posts");
        // Don't set posts to empty, keep existing posts on error
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }, []);

  // Load more posts
  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    
    setLoadingMore(true);
    try {
      await fetchPosts(false, false, searchFilters, offset);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchPosts, searchFilters, offset]);

  // Handle search
  const handleSearch = useCallback((filters: SearchFilters) => {
    setSearchFilters(filters);
    setIsSearching(Object.keys(filters).length > 0);
    setOffset(0);
    fetchPosts(false, true, filters, 0);
  }, [fetchPosts]);

  // Handle sort toggle (Popular / Latest)
  const handleSortToggle = useCallback((sort: "trending" | "new") => {
    setActiveSort(sort);
    const newFilters = { ...searchFilters, sortBy: sort };
    setSearchFilters(newFilters);
    setOffset(0);
    fetchPosts(false, true, newFilters, 0);
  }, [fetchPosts, searchFilters]);

  // Initial fetch
  useEffect(() => {
    fetchPosts(true, true, {}, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle manual refresh
  const handleRefresh = () => {
    setOffset(0);
    fetchPosts(true, true, searchFilters, 0);
  };

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const scrollTop = document.documentElement.scrollTop;
      const clientHeight = document.documentElement.clientHeight;
      
      // Load more when user is 300px from bottom
      if (scrollHeight - scrollTop - clientHeight < 300 && hasMore && !loadingMore) {
        loadMorePosts();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [hasMore, loadingMore, loadMorePosts]);

  // No tab filtering anymore: just use all posts
  const filtered = posts;

  const handleTrade = (post: FeedPost) => {
    void navigate({ to: "/token/$tokenId", params: { tokenId: post.id } });
  };

  return (
    <>
      <section id="feed" className="relative mx-auto w-full max-w-6xl">
        {/* Container with flex to reorder on mobile */}
        <div className="flex flex-col">
          {/* Dashboard Section - Order 1 on mobile, 2 on desktop */}
          <div className="z-40 mb-6 order-1 sm:order-2">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto scrollbar-hide">
                {/* Popular / Latest Toggle */}
                <div className="inline-flex rounded-full border border-white/10 bg-white/5 p-0.5">
                  <button
                    onClick={() => handleSortToggle("trending")}
                    className={
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 " +
                      (activeSort === "trending"
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/60 hover:text-white")
                    }
                  >
                    Popular
                  </button>
                  <button
                    onClick={() => handleSortToggle("new")}
                    className={
                      "px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200 " +
                      (activeSort === "new"
                        ? "bg-white/15 text-white shadow-sm"
                        : "text-white/60 hover:text-white")
                    }
                  >
                    Latest
                  </button>
                </div>
                {/* Refresh Button */}
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing || loading}
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 rounded-full border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white disabled:opacity-50 flex-shrink-0 transition-all"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                </Button>
                {/* Tabs removed */}
              </div>
            </div>
          </div>

          {/* Search Bar - Order 2 on mobile, 1 on desktop */}
          <div className="mb-4 sm:mb-8 order-2 sm:order-1">
            <SearchBar onSearch={handleSearch} showFilters={true} />
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div
                key={i}
                className="h-80 sm:h-96 animate-pulse rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && !loading && posts.length === 0 && (
          <div className="rounded-2xl sm:rounded-3xl border border-red-500/20 bg-red-500/5 p-6 sm:p-8 text-center">
            <p className="text-sm sm:text-base text-red-400">⚠️ {error}</p>
            <button
              onClick={handleRefresh}
              className="mt-4 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-4 sm:px-6 py-2 text-xs sm:text-sm text-white transition-colors hover:bg-white/10"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && posts.length === 0 && (
          <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-12 text-center">
            <p className="text-lg sm:text-xl text-white/70">📭 No tokenized posts yet</p>
            <p className="mt-2 text-xs sm:text-sm text-white/50">
              Be the first to tokenize a Reddit post!
            </p>
          </div>
        )}

        {/* Posts Grid */}
        {!loading && filtered.length > 0 && (
          <>
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((post) => (
                <FeedCard key={post.id} post={post} onTrade={handleTrade} />
              ))}
            </div>

            {/* Load More Indicator */}
            {loadingMore && (
              <div className="mt-6 sm:mt-8 flex justify-center">
                <div className="flex items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-4 sm:px-6 py-2 sm:py-3">
                  <div className="h-4 w-4 sm:h-5 sm:w-5 animate-spin rounded-full border-2 border-white/20 border-t-white"></div>
                  <span className="text-xs sm:text-sm text-white/70">Loading more posts...</span>
                </div>
              </div>
            )}

            {/* End of Results */}
            {!hasMore && !loadingMore && (
              <div className="mt-6 sm:mt-8 text-center">
                <p className="text-xs sm:text-sm text-white/50">
                  🎉 You've reached the end! No more posts to load.
                </p>
              </div>
            )}
          </>
        )}
      </section>

    </>
  );
}
