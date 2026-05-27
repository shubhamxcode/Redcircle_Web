import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, ArrowRightLeft, RefreshCw, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import TradingModal from "@/components/TradingModal";
import PriceChart from "@/components/PriceChart";
import type { FeedPost } from "@/components/FeedCard";
import { cn } from "@/lib/utils";

type DexPair = {
  priceUsd: string;
  priceNative: string;
  volume: { h24: number; h6: number; h1: number; m5: number };
  priceChange: { h24?: number; h6?: number; h1?: number; m5?: number };
  liquidity?: { usd: number };
  fdv: number;
  marketCap: number;
  txns: { h24: { buys: number; sells: number } };
  pairAddress: string;
};

async function fetchDexScreenerData(mintAddress: string): Promise<DexPair | null> {
  try {
    const { getApiUrl } = await import("@/lib/auth");
    const res = await fetch(`${getApiUrl()}/api/tokens/${mintAddress}/price`);
    const data = await res.json() as { pair: DexPair | null };
    return data.pair ?? null;
  } catch {
    return null;
  }
}

function fmt(n: number | null | undefined, prefix = "$") {
  if (n == null) return "—";
  if (n >= 1_000_000) return `${prefix}${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${prefix}${(n / 1_000).toFixed(1)}K`;
  return `${prefix}${n.toFixed(2)}`;
}

export const Route = createFileRoute("/token/$tokenId")({
  component: TokenDetailsPage,
});

type BackendPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes?: number;
  comments?: number;
  tokenizedAt?: string;
  createdAt?: string;
  thumbnail?: string | null;
  currentPrice?: string | number | null;
  marketCap?: string | number | null;
  totalVolume?: string | number | null;
  tokenSymbol?: string;
  initialPrice?: string;
  status?: string;
  tokenMintAddress?: string | null;
  redditUrl?: string | null;
  tokenSupply?: string | number | null;
  holders?: number | null;
};

function toNumber(value: string | number | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function normalizePost(post: BackendPost): FeedPost {
  return {
    id: post.id,
    title: post.title,
    subreddit: post.subreddit,
    author: post.author,
    upvotes: post.upvotes || 0,
    comments: post.comments || 0,
    createdAt: post.tokenizedAt || post.createdAt || new Date().toISOString(),
    imageUrl: post.thumbnail || undefined,
    tokenPrice: toNumber(post.currentPrice),
    marketCap: toNumber(post.marketCap),
    volume24h: toNumber(post.totalVolume),
    tokenSymbol: post.tokenSymbol,
    initialPrice: post.initialPrice,
    status: post.status,
    tokenMintAddress: post.tokenMintAddress || undefined,
    redditUrl: post.redditUrl || undefined,
    totalSupply: toNumber(post.tokenSupply),
    holders: post.holders || 0,
  };
}

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-4 py-2.5 rounded-xl bg-white/5 border border-white/8 min-w-[100px]">
      <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
      {sub && <span className="text-[10px] text-white/30">{sub}</span>}
    </div>
  );
}

function TokenDetailsPage() {
  const { tokenId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [dex, setDex] = useState<DexPair | null>(null);
  const [dexLoading, setDexLoading] = useState(false);

  const fetchTokenDetails = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/posts/${tokenId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch token details");

      const normalized = normalizePost(data.post);
      setPost(normalized);

      if (normalized.tokenMintAddress) {
        setDexLoading(true);
        fetchDexScreenerData(normalized.tokenMintAddress)
          .then(setDex)
          .finally(() => setDexLoading(false));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load token");
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [tokenId]);

  useEffect(() => { void fetchTokenDetails(true); }, [fetchTokenDetails]);

  useEffect(() => {
    if (!post?.tokenMintAddress) return;
    const interval = setInterval(() => {
      fetchDexScreenerData(post.tokenMintAddress!).then(setDex);
    }, 30_000);
    return () => clearInterval(interval);
  }, [post?.tokenMintAddress]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white" />
          <p className="text-sm text-white/50">Loading token...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24 px-6">
        <div className="text-center">
          <p className="text-xl text-red-400">⚠️ {error || "Token not found"}</p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-6" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  const priceChange = dex
    ? (dex.priceChange.h24 ?? 0)
    : post.tokenPrice && post.initialPrice
      ? (post.tokenPrice - parseFloat(post.initialPrice)) / parseFloat(post.initialPrice) * 100
      : 0;
  const isPositive = priceChange >= 0;
  const isOnChain = !!post.tokenMintAddress;

  return (
    <div className="min-h-screen pb-16 bg-black">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 py-3">
          <button
            onClick={() => navigate({ to: "/" })}
            className="flex items-center gap-1.5 text-xs sm:text-sm text-white/50 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Feed
          </button>
          <span className="text-white/20">/</span>
          <span className="text-xs sm:text-sm text-white/70 font-medium truncate max-w-[120px] sm:max-w-none">{post.tokenSymbol}</span>
        </div>

        {/* ── Token header ── */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 py-3 sm:py-4 border-b border-white/8"
        >
          {/* Identity */}
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {post.imageUrl ? (
              <img src={post.imageUrl} alt={post.tokenSymbol}
                className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl object-cover flex-shrink-0 border border-white/10" />
            ) : (
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center flex-shrink-0 border border-white/10">
                <span className="text-xs font-bold text-white">{post.tokenSymbol?.slice(0, 2)}</span>
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-white">{post.tokenSymbol}</h1>
                <span className={cn(
                  "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                  post.status === "active" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
                )}>{post.status}</span>
              </div>
              <p className="text-xs text-white/40 truncate max-w-[200px] sm:max-w-sm md:max-w-lg">{post.title}</p>
            </div>
          </div>

          {/* Price — left-aligned on mobile, right-aligned on sm+ */}
          <div className="flex items-end gap-2 sm:text-right">
            <div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                  {dex ? `$${parseFloat(dex.priceUsd).toFixed(6)}` : "—"}
                </span>
                {dexLoading && <RefreshCw className="h-3 w-3 animate-spin text-white/30" />}
              </div>
              <div className={cn("flex items-center gap-1 text-xs sm:text-sm font-semibold", isPositive ? "text-green-400" : "text-red-400")}>
                {isPositive ? <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                {isPositive ? "+" : ""}{priceChange.toFixed(2)}% (24h)
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Stats strip ── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2 py-3 border-b border-white/8"
        >
          {dex?.marketCap ? <StatPill label="Market Cap" value={fmt(dex.marketCap)} /> : null}
          {dex?.volume.h24 != null ? <StatPill label="Volume 24h" value={fmt(dex.volume.h24)} /> : null}
          {dex?.liquidity?.usd ? <StatPill label="Liquidity" value={fmt(dex.liquidity.usd)} /> : null}
          {dex?.txns.h24 && (
            <StatPill
              label="Txns 24h"
              value={`${dex.txns.h24.buys + dex.txns.h24.sells}`}
              sub={`${dex.txns.h24.buys}B / ${dex.txns.h24.sells}S`}
            />
          )}
          {dex && <span className="hidden sm:inline self-center text-[10px] text-white/20 ml-auto">Live · DexScreener</span>}
        </motion.div>

        {/* ── Main grid: chart (top/left) + right panel (bottom/right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] xl:grid-cols-[1fr_340px] gap-4 mt-4">

          {/* Chart */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="order-2 lg:order-1"
          >
            {isOnChain ? (
              <div className="rounded-2xl border border-white/8 overflow-hidden bg-[#0d0d0d]"
                style={{ height: "min(520px, 70vw)", minHeight: 320 }}>
                <iframe
                  src={`https://dexscreener.com/solana/${post.tokenMintAddress}?embed=1&theme=dark&trades=1&info=0`}
                  style={{ width: "100%", height: "100%", border: "none" }}
                  title="Live Chart"
                />
              </div>
            ) : (
              <PriceChart
                postId={post.id}
                currentPrice={post.tokenPrice || 0}
                initialPrice={parseFloat(post.initialPrice || "0.001")}
                tokenSymbol={post.tokenSymbol}
                refreshKey={chartRefreshKey}
              />
            )}
          </motion.div>

          {/* Right panel */}
          <motion.div
            initial={{ opacity: 0, x: 0, y: 8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ delay: 0.2 }}
            className="order-1 lg:order-2 space-y-3"
          >
            {/* Trade */}
            {isOnChain ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-2">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Trade</p>
                <a
                  href={`https://dexscreener.com/solana/${post.tokenMintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-3 text-sm font-bold text-black hover:bg-green-400 transition-colors"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Trade on DexScreener
                </a>
                <a
                  href={`https://jup.ag/swap/SOL-${post.tokenMintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-white/10 bg-white/5 py-2.5 text-xs text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                >
                  Jupiter <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : (
              <TradingModal post={post} isOpen={true} onClose={() => { setChartRefreshKey(k => k + 1); void fetchTokenDetails(false); }} />
            )}

            {/* Token info */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-3">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Token Info</p>
              {post.tokenMintAddress && (
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">Mint Address</p>
                  <p className="text-[11px] text-white/70 font-mono break-all leading-relaxed">{post.tokenMintAddress}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">Symbol</p>
                  <p className="text-xs font-semibold text-white">{post.tokenSymbol}</p>
                </div>
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">FDV</p>
                  <p className="text-xs font-semibold text-white">{dex?.fdv ? fmt(dex.fdv) : "—"}</p>
                </div>
              </div>
            </div>

            {/* Original post */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-2.5">
              <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Source Post</p>
              <p className="text-sm font-medium text-white leading-snug line-clamp-3">{post.title}</p>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/40">
                <span>r/{post.subreddit}</span>
                <span>·</span>
                <span>u/{post.author}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span>↑ {post.upvotes}</span>
                <span>💬 {post.comments}</span>
              </div>
              {post.redditUrl && (
                <a
                  href={post.redditUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                >
                  View on Reddit <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
