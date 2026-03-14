import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import MarketChart from "@/components/MarketChart";
import RecentTradesList from "@/components/RecentTradesList";
import TopCuratorsList from "@/components/TopCuratorsList";
import MarketTradePanel from "@/components/MarketTradePanel";
import type { FeedPost } from "@/components/FeedCard";
import { useMarketDemoState } from "@/hooks/useMarketDemoState";

export const Route = createFileRoute("/token/$tokenId")({
  component: TokenDetailsPage,
});

function TokenDetailsPage() {
  const { tokenId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {
    marketStats,
    chartPoints,
    recentTrades,
    topCurators,
  } = useMarketDemoState(post?.id, parseFloat(post?.initialPrice || "0.001"));

  useEffect(() => {
    const fetchTokenDetails = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetchWithAuth(`/api/posts/${tokenId}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch token details");
        }

        setPost(data.post);
      } catch (err) {
        console.error(" Error fetching token details:", err);
        setError(err instanceof Error ? err.message : "Failed to load token");
      } finally {
        setLoading(false);
      }
    };

    fetchTokenDetails();
  }, [tokenId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          <p className="text-white/70">Loading token details...</p>
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24 px-6">
        <div className="max-w-md text-center">
          <p className="text-xl text-red-400">⚠️ {error || "Token not found"}</p>
          <Button
            onClick={() => navigate({ to: "/" })}
            className="mt-6"
            variant="outline"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  const livePrice = marketStats?.currentPrice ?? post.tokenPrice ?? 0;
  const postImage = post.imageUrl;
  const postSourceLabel = (() => {
    if (!post.redditUrl) return "source unavailable";
    try {
      const url = new URL(post.redditUrl);
      return url.hostname.replace("www.", "");
    } catch {
      return "reddit.com";
    }
  })();

  return (
    <div className="relative min-h-screen pt-24 px-4 pb-14">
      <div className="mx-auto w-full max-w-[1400px]">
        {/* Back Button */}
        <Button
          onClick={() => navigate({ to: "/" })}
          variant="ghost"
          className="mb-4 text-white/70 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[320px_minmax(0,1fr)_300px]">
          {/* Left Column */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-4"
          >
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/70 backdrop-blur-xl">
              <div className="p-4">
                <div className="mb-2 text-sm font-semibold text-white">{post.tokenSymbol}</div>
                <div className="mb-2 text-xs text-white/60">r/{post.subreddit} • u/{post.author}</div>
                <h2 className="line-clamp-3 text-sm text-white/85">{post.title}</h2>
              </div>
              {postImage ? (
                <a href={post.redditUrl || "#"} target="_blank" rel="noopener noreferrer" className="block">
                  <img src={postImage} alt={post.title} className="h-[300px] w-full object-cover" />
                </a>
              ) : (
                <div className="flex h-[300px] items-center justify-center bg-white/5 text-sm text-white/40">
                  No preview image
                </div>
              )}
              <div className="border-t border-white/10 p-3">
                <a
                  href={post.redditUrl || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                >
                  Open on Reddit
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            <TopCuratorsList curators={topCurators} />
          </motion.div>

          {/* Middle Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-5 overflow-hidden rounded-2xl border border-white/10 bg-black/70 text-sm backdrop-blur-xl">
              <div className="border-r border-white/10 p-3">
                <div className="text-xs text-white/50">Market Cap</div>
                <div className="mt-1 font-semibold text-white">{(marketStats?.marketCap ?? 0).toFixed(2)}</div>
              </div>
              <div className="border-r border-white/10 p-3">
                <div className="text-xs text-white/50">Rank</div>
                <div className="mt-1 font-semibold text-white">2</div>
              </div>
              <div className="border-r border-white/10 p-3">
                <div className="text-xs text-white/50">Holders</div>
                <div className="mt-1 font-semibold text-white">{marketStats?.holders ?? 0}</div>
              </div>
              <div className="border-r border-white/10 p-3">
                <div className="text-xs text-white/50">Author</div>
                <div className="mt-1 font-semibold text-white">{post.author}</div>
              </div>
              <div className="p-3">
                <div className="text-xs text-white/50">Source</div>
                <div className="mt-1 font-semibold text-white">{postSourceLabel}</div>
              </div>
            </div>

            <MarketChart
              points={chartPoints}
              currentPrice={livePrice}
              initialPrice={parseFloat(post.initialPrice || "0.001")}
            />
            <RecentTradesList trades={recentTrades} />
          </motion.div>

          {/* Right Column */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <MarketTradePanel tokenSymbol={post.tokenSymbol} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}


