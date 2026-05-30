import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, ArrowRightLeft, RefreshCw, TrendingUp, TrendingDown, Copy, Check } from "lucide-react";
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


function TokenDetailsPage() {
  const { tokenId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRefreshKey, setChartRefreshKey] = useState(0);
  const [dex, setDex] = useState<DexPair | null>(null);
  const [dexLoading, setDexLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [creatorEarnings, setCreatorEarnings] = useState<string>("0");

  const fetchTokenDetails = useCallback(async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      setError(null);

      const response = await fetchWithAuth(`/api/posts/${tokenId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to fetch token details");

      const normalized = normalizePost(data.post);
      setPost(normalized);

      // Fetch creator earnings
      try {
        const { getApiUrl } = await import("@/lib/auth");
        const erRes  = await fetch(`${getApiUrl()}/api/posts/${tokenId}/creator-earnings`);
        const erData = await erRes.json() as { success: boolean; earningsUsdc?: string };
        if (erData.success && erData.earningsUsdc != null) setCreatorEarnings(erData.earningsUsdc);
      } catch { /* non-critical */ }

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
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-white/10 border-t-white" />
          <p className="text-sm text-white/50">Loading token...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center">
          <p className="text-xl text-red-400">⚠️ {error || "Token not found"}</p>
          <Button onClick={() => navigate({ to: "/" })} className="mt-6" variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  // Only show price change when DexScreener has real h24 data
  const priceChange = dex?.priceChange.h24 ?? null;
  const isPositive = (priceChange ?? 0) >= 0;
  const isOnChain = !!post.tokenMintAddress;

  return (
    <div className="min-h-screen pb-16 bg-black">
      <div className="mx-auto w-full max-w-7xl px-3 sm:px-4 lg:px-6">

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
              </div>
              <p className="text-xs text-white/40 truncate max-w-[200px] sm:max-w-sm md:max-w-lg">{post.title}</p>
            </div>
          </div>

          {/* Price — only when DexScreener has data */}
          {(dex || dexLoading) && (
            <div className="flex items-end gap-2 sm:text-right">
              <div>
                <div className="flex items-baseline gap-2">
                  {dex && (
                    <span className="text-2xl sm:text-3xl font-bold text-white tabular-nums">
                      ${parseFloat(dex.priceUsd).toFixed(6)}
                    </span>
                  )}
                  {dexLoading && <RefreshCw className="h-3 w-3 animate-spin text-white/30" />}
                </div>
                {priceChange !== null && (
                  <div className={cn("flex items-center gap-1 text-xs sm:text-sm font-semibold", isPositive ? "text-green-400" : "text-red-400")}>
                    {isPositive ? <TrendingUp className="h-3 w-3 sm:h-3.5 sm:w-3.5" /> : <TrendingDown className="h-3 w-3 sm:h-3.5 sm:w-3.5" />}
                    {isPositive ? "+" : ""}{priceChange.toFixed(2)}% (24h)
                  </div>
                )}
              </div>
            </div>
          )}
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
            {/* Creator earnings */}
            {(
              <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3">
                <p className="text-[9px] font-semibold text-white/40 uppercase tracking-widest mb-1">Creator Earnings</p>
                <p className="text-2xl font-bold text-white">${parseFloat(creatorEarnings).toFixed(2)} <span className="text-sm font-normal text-white/40">USDC</span></p>
              </div>
            )}

            {/* Trade */}
            {isOnChain ? (
              <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-2">
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider mb-3">Trade</p>
                <a
                  href={`https://jup.ag/swap/SOL-${post.tokenMintAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-500 py-2.5 text-sm font-bold text-black hover:bg-green-400 transition-colors"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  Trade on Jupiter
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
                  <p className="text-[10px] text-white/30 mb-1">Mint Address</p>
                  <div className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/10 px-3 py-2">
                    <p className="text-[11px] text-white/70 font-mono flex-1" title={post.tokenMintAddress}>
                      {post.tokenMintAddress.slice(0, 4)}...{post.tokenMintAddress.slice(-4)}
                    </p>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(post.tokenMintAddress!);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="shrink-0 text-white/40 hover:text-white transition-colors"
                      title="Copy mint address"
                    >
                      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              )}
              <div className="flex flex-wrap gap-3">
                <div>
                  <p className="text-[10px] text-white/30 mb-0.5">Symbol</p>
                  <p className="text-xs font-semibold text-white">{post.tokenSymbol}</p>
                </div>
                {dex?.fdv ? (
                  <div>
                    <p className="text-[10px] text-white/30 mb-0.5">FDV</p>
                    <p className="text-xs font-semibold text-white">{fmt(dex.fdv)}</p>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Original post */}
            <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4 space-y-2.5">
              <div className="flex items-center gap-1.5">
                <svg className="h-3.5 w-3.5 text-[#FF4500]" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wider">Source Post</p>
              </div>
              <p className="text-sm font-medium text-white leading-snug line-clamp-2">{post.title}</p>
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
                  className="inline-flex items-center gap-2 rounded-lg bg-[#FF4500]/10 hover:bg-[#FF4500]/20 border border-[#FF4500]/25 hover:border-[#FF4500]/50 px-3 py-1.5 text-xs font-semibold text-[#FF4500] transition-all"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z"/></svg>
                  View on Reddit
                </a>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
