import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw, ChevronDown, Check } from "lucide-react";
import FeedCard, { type FeedPost } from "@/components/FeedCard";
import SearchBar, { type SearchFilters } from "@/components/SearchBar";
import { getApiUrl } from "@/lib/auth";
import { cn } from "@/lib/utils";

type BackendPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  tokenizedAt: string;
  redditCreatedAt?: string;
  thumbnail?: string;
  tags?: string[];
  currentPrice?: string;
  marketCap?: string;
  totalVolume?: string;
  featured: number;
  tokenSymbol?: string;
  initialPrice?: string;
  status?: string;
  tokenMintAddress?: string;
  redditUrl?: string;
  tokenSupply?: number | string;
  holders?: number;
};

type SortField   = "totalVolume" | "marketCap" | "currentPrice" | "tokenizedAt";
type SortOrder   = "desc" | "asc";
type TimeWindow  = "all" | "1h" | "4h" | "24h" | "7d" | "30d";

const SORT_FIELDS: { value: SortField; label: string }[] = [
  { value: "totalVolume",  label: "Volume" },
  { value: "marketCap",    label: "Market Cap" },
  { value: "currentPrice", label: "Price Chg 24h" },
  { value: "tokenizedAt",  label: "Creation Time" },
];
const SORT_ORDERS: { value: SortOrder; label: string }[] = [
  { value: "desc", label: "Descending" },
  { value: "asc",  label: "Ascending" },
];
const TIME_WINDOWS: { value: TimeWindow; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "1h",  label: "1 Hour" },
  { value: "4h",  label: "4 Hours" },
  { value: "24h", label: "24 Hours" },
  { value: "7d",  label: "7 Days" },
  { value: "30d", label: "30 Days" },
];

function FilterDropdown<T extends string>({
  options, value, onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const label = options.find((o) => o.value === value)?.label ?? value;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "flex items-center gap-1 sm:gap-2 rounded-xl border px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-white transition-all min-w-0 flex-1 justify-between whitespace-nowrap",
          open
            ? "border-[#E8431C]/70 bg-[#0d0d14] shadow-[0_0_0_1px_rgba(232,67,28,0.3),0_0_16px_rgba(232,67,28,0.15)]"
            : "border-[#E8431C]/30 bg-[#0d0d14] hover:border-[#E8431C]/60",
        )}
      >
        {label}
        <ChevronDown className={cn("h-3 w-3 sm:h-3.5 sm:w-3.5 text-white/50 transition-transform shrink-0", open && "rotate-180")} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1.5 w-full min-w-[150px] rounded-xl border border-white/10 bg-[#111118] py-1 shadow-xl"
          >
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left",
                  opt.value === value
                    ? "bg-white/[0.07] text-white font-medium"
                    : "text-white/60 hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <span className="w-4 flex-shrink-0">
                  {opt.value === value && <Check className="h-3.5 w-3.5 text-[#E8431C]" />}
                </span>
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function transformPost(post: BackendPost): FeedPost {
  return {
    id: post.id,
    title: post.title,
    subreddit: post.subreddit,
    author: post.author,
    upvotes: post.upvotes || 0,
    comments: post.comments || 0,
    createdAt: post.tokenizedAt,
    imageUrl: post.thumbnail || undefined,
    flair: post.tags?.[0],
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
  };
}

export default function RedditFeed() {
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});
  const [sortField,  setSortField]  = useState<SortField>("totalVolume");
  const [sortOrder,  setSortOrder]  = useState<SortOrder>("desc");
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");

  const fetchPosts = useCallback(
    async (opts: {
      refreshing?: boolean;
      reset?: boolean;
      filters?: SearchFilters;
      field?: SortField;
      order?: SortOrder;
      time?: TimeWindow;
      currentOffset?: number;
    } = {}) => {
      const {
        refreshing = false,
        reset = true,
        filters = searchFilters,
        field = sortField,
        order = sortOrder,
        time = timeWindow,
        currentOffset = 0,
      } = opts;

      try {
        refreshing ? setIsRefreshing(true) : setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const useOffset = reset ? 0 : currentOffset;

        const hasSearchParams =
          filters.q || filters.subreddit || filters.author ||
          filters.minPrice != null || filters.maxPrice != null ||
          filters.minVolume != null || filters.minMarketCap != null ||
          filters.tags;

        let url = hasSearchParams
          ? `${apiUrl}/api/posts/search?sortBy=${field}&order=${order}&`
          : `${apiUrl}/api/posts?status=active&sortBy=${field}&order=${order}&`;

        url += `limit=20&offset=${useOffset}`;
        if (time && time !== "all") url += `&since=${time}`;

        if (filters.q) url += `&q=${encodeURIComponent(filters.q)}`;
        if (filters.subreddit) url += `&subreddit=${encodeURIComponent(filters.subreddit)}`;
        if (filters.author) url += `&author=${encodeURIComponent(filters.author)}`;
        if (filters.tags) url += `&tags=${encodeURIComponent(filters.tags)}`;

        const response = await fetch(url);
        if (!response.ok) throw new Error("Failed to fetch posts");

        const data = await response.json();
        const transformed: FeedPost[] = (data.posts || []).map(transformPost);

        if (reset) {
          setPosts(transformed);
          setOffset(transformed.length);
        } else {
          setPosts((prev) => [...prev, ...transformed]);
          setOffset((prev) => prev + transformed.length);
        }
        setHasMore(data.hasMore || false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load posts");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [searchFilters, sortField, sortOrder, timeWindow],
  );

  // Initial load
  useEffect(() => {
    fetchPosts({ reset: true, currentOffset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFieldChange = (field: SortField) => {
    setSortField(field);
    setOffset(0);
    fetchPosts({ reset: true, field, order: sortOrder, time: timeWindow, currentOffset: 0 });
  };

  const handleOrderChange = (order: SortOrder) => {
    setSortOrder(order);
    setOffset(0);
    fetchPosts({ reset: true, field: sortField, order, time: timeWindow, currentOffset: 0 });
  };

  const handleTimeChange = (time: TimeWindow) => {
    setTimeWindow(time);
    setOffset(0);
    fetchPosts({ reset: true, field: sortField, order: sortOrder, time, currentOffset: 0 });
  };

  // Re-fetch when search changes
  const handleSearch = useCallback(
    (filters: SearchFilters) => {
      setSearchFilters(filters);
      setOffset(0);
      fetchPosts({ reset: true, filters, field: sortField, order: sortOrder, time: timeWindow, currentOffset: 0 });
    },
    [sortField, sortOrder, timeWindow, fetchPosts],
  );

  const handleRefresh = () => {
    setOffset(0);
    fetchPosts({ refreshing: true, reset: true, currentOffset: 0 });
  };

  // Infinite scroll via IntersectionObserver on a sentinel element
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMorePosts = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchPosts({ reset: false, currentOffset: offset });
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, hasMore, fetchPosts, offset]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMorePosts(); },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMorePosts]);

  return (
    <section className="relative mx-auto w-full max-w-6xl">
      {/* Header controls */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <SearchBar onSearch={handleSearch} showFilters />

        {/* Filter + Refresh row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FilterDropdown options={SORT_FIELDS}   value={sortField}  onChange={handleFieldChange} />
            <FilterDropdown options={SORT_ORDERS}   value={sortOrder}  onChange={handleOrderChange} />
            <FilterDropdown options={TIME_WINDOWS}  value={timeWindow} onChange={handleTimeChange} />
          </div>

          <button
            onClick={handleRefresh}
            disabled={isRefreshing || loading}
            className="flex items-center justify-center h-9 w-9 rounded-xl border border-white/5 bg-neutral-900/60 text-white/40 hover:text-white hover:bg-neutral-900 transition-all disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
          </button>
        </div>
      </div>

      {/* Skeleton — shown on initial load only */}
      <AnimatePresence mode="wait">
        {loading && (
          <motion.div
            key="skeleton"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3"
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex flex-col overflow-hidden rounded-2xl border border-white/5 bg-[#0f0f0f]">
                <div className="h-48 animate-pulse bg-white/[0.04]" />
                <div className="flex flex-col gap-3 p-4">
                  <div className="h-3 w-3/4 animate-pulse rounded-full bg-white/[0.04]" />
                  <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/[0.04]" />
                  <div className="mt-1 h-2 w-1/3 animate-pulse rounded-full bg-white/[0.03]" />
                </div>
              </div>
            ))}
          </motion.div>
        )}

        {/* Error */}
        {error && !loading && posts.length === 0 && (
          <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-red-500/15 bg-red-500/5 p-8 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={handleRefresh}
              className="mt-4 rounded-xl border border-white/10 bg-white/5 px-5 py-2 text-xs text-white transition-colors hover:bg-white/10">
              Try Again
            </button>
          </motion.div>
        )}

        {/* Empty */}
        {!loading && !error && posts.length === 0 && (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded-2xl border border-white/5 bg-white/[0.02] p-12 text-center">
            <p className="text-white/50">No tokenized posts yet</p>
            <p className="mt-1 text-xs text-white/30">Be the first to tokenize a Reddit post!</p>
          </motion.div>
        )}

        {/* Grid */}
        {!loading && posts.length > 0 && (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
          >
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {posts.map((post, i) => (
                <FeedCard key={post.id} post={post} index={i} />
              ))}
            </div>

            {/* Sentinel for IntersectionObserver */}
            <div ref={sentinelRef} className="h-1" />

            {loadingMore && (
              <div className="mt-8 flex justify-center">
                <div className="flex items-center gap-2.5 rounded-xl border border-white/5 bg-white/5 px-5 py-2.5">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
                  <span className="text-xs text-white/50">Loading more…</span>
                </div>
              </div>
            )}

            {!hasMore && !loadingMore && posts.length > 0 && (
              <p className="mt-8 text-center text-xs text-white/25">You've seen everything</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
