import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fetchWithAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { ArrowLeft, ExternalLink, TrendingUp, Users, Activity, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import PriceChart from "@/components/PriceChart";
import TradingModal from "@/components/TradingModal";
import type { FeedPost } from "@/components/FeedCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/token/$tokenId")({
  beforeLoad: () => { throw redirect({ to: "/home" }); },
  component: TokenDetailsPage,
});

function TokenDetailsPage() {
  const { tokenId } = Route.useParams();
  const navigate = Route.useNavigate();
  const [post, setPost] = useState<FeedPost | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTradingModal, setShowTradingModal] = useState(false);

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
        console.error("❌ Error fetching token details:", err);
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

  const priceChange = post.tokenPrice && post.initialPrice 
    ? ((post.tokenPrice - parseFloat(post.initialPrice)) / parseFloat(post.initialPrice) * 100).toFixed(2)
    : "0";
  const isPositive = parseFloat(priceChange) >= 0;

  return (
    <div className="relative min-h-screen pt-24 px-6 pb-20">
      <div className="mx-auto w-full max-w-6xl">
        {/* Back Button */}
        <Button
          onClick={() => navigate({ to: "/" })}
          variant="ghost"
          className="mb-6 text-white/70 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left Column - Token Info */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-1 space-y-6"
          >
            {/* Token Header Card */}
            <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-white">{post.tokenSymbol}</h1>
                  <p className="mt-1 text-sm text-white/60">Token</p>
                </div>
                <div
                  className={cn(
                    "rounded-2xl px-3 py-1.5 text-xs font-semibold",
                    post.status === "active"
                      ? "bg-green-500/20 text-green-400"
                      : "bg-yellow-500/20 text-yellow-400"
                  )}
                >
                  {post.status}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-3xl font-bold text-white">
                    {post.tokenPrice?.toFixed(6) || "0.000000"} SOL
                  </div>
                  <div
                    className={cn(
                      "mt-1 text-sm font-semibold",
                      isPositive ? "text-green-400" : "text-red-400"
                    )}
                  >
                    {isPositive ? "+" : ""}
                    {priceChange}%
                  </div>
                </div>

                <Button
                  onClick={() => setShowTradingModal(true)}
                  className="w-full rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 py-6 text-lg font-semibold hover:from-purple-700 hover:to-blue-700"
                >
                  Trade Now
                </Button>

                {post.tokenMintAddress && (
                  <a
                    href={`https://solscan.io/token/${post.tokenMintAddress}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    View on Solscan
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Stats Card */}
            <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
              <h3 className="mb-4 text-lg font-semibold text-white">Token Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <Activity className="h-4 w-4" />
                    <span className="text-sm">Volume 24h</span>
                  </div>
                  <span className="font-semibold text-white">
                    {post.volume24h?.toFixed(3) || "0.000"} SOL
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm">Market Cap</span>
                  </div>
                  <span className="font-semibold text-white">
                    {post.marketCap?.toFixed(2) || "0.00"} SOL
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <Users className="h-4 w-4" />
                    <span className="text-sm">Holders</span>
                  </div>
                  <span className="font-semibold text-white">{post.holders || 0}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white/60">
                    <TrendingUp className="h-4 w-4" />
                    <span className="text-sm">Total Supply</span>
                  </div>
                  <span className="font-semibold text-white">
                    {post.totalSupply?.toLocaleString() || "N/A"}
                  </span>
                </div>
              </div>
            </div>

            {/* Post Info Card */}
            <div className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl">
              <h3 className="mb-4 text-lg font-semibold text-white">Original Post</h3>
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-white">{post.title}</h4>
                <div className="flex items-center gap-3 text-xs text-white/60">
                  <span>r/{post.subreddit}</span>
                  <span>•</span>
                  <span>u/{post.author}</span>
                </div>
                <div className="flex items-center gap-4 text-xs text-white/50">
                  <span>↑ {post.upvotes}</span>
                  <span>💬 {post.comments}</span>
                </div>
                {post.redditUrl && (
                  <a
                    href={post.redditUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300"
                  >
                    View on Reddit
                    <ExternalLink className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          </motion.div>

          {/* Right Column - Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:col-span-2"
          >
            <PriceChart
              postId={post.id}
              currentPrice={post.tokenPrice || 0}
              initialPrice={parseFloat(post.initialPrice || "0.001")}
              tokenSymbol={post.tokenSymbol}
            />
          </motion.div>
        </div>
      </div>

      {/* Trading Modal */}
      {showTradingModal && (
        <TradingModal
          post={post}
          isOpen={showTradingModal}
          onClose={() => setShowTradingModal(false)}
        />
      )}
    </div>
  );
}


