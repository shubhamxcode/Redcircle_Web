import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth, getApiUrl } from "@/lib/auth";
import { motion } from "motion/react";
import { RefreshCw, ArrowUpRight, ArrowDownRight, Filter, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Define types for transaction data
interface Transaction {
  transactionId: string;
  type: string;
  amount: number;
  pricePerToken: string;
  totalValue: string;
  signature: string;
  tokenMintAddress: string;
  walletAddress: string;
  networkFee: string;
  platformFee: string;
  status: string;
  createdAt: string;
  postId: string;
  postTitle: string;
  postSubreddit: string;
  postThumbnail?: string;
  postTokenSymbol?: string;
}

interface TransactionStats {
  totalTransactions: number;
  totalBuys: number;
  totalSells: number;
  totalVolume: string;
  totalBuyVolume: string;
  totalSellVolume: string;
  totalFees: string;
}

export const Route = createFileRoute("/transactions")({
  beforeLoad: () => { throw redirect({ to: "/home" }); },
  component: TransactionsPage,
});

function TransactionsPage() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const navigate = useNavigate();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell">("all");

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate({ to: "/signin", search: { redirect: "/transactions" } });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const fetchTransactionData = useCallback(
    async (showRefreshing = false) => {
      if (!user?.id) return;

      try {
        if (showRefreshing) setIsRefreshing(true);
        else setLoading(true);
        setError(null);

        const queryParams = new URLSearchParams();
        if (filterType !== "all") {
          queryParams.set("type", filterType);
        }

        const [transactionsRes, statsRes] = await Promise.all([
          fetchWithAuth(`/api/transactions?${queryParams.toString()}`),
          fetchWithAuth(`/api/transactions/stats`),
        ]);

        const transactionsData = await transactionsRes.json();
        const statsData = await statsRes.json();

        if (!transactionsRes.ok || !statsRes.ok) {
          throw new Error(
            transactionsData.error ||
              statsData.error ||
              "Failed to fetch transaction data"
          );
        }

        setTransactions(transactionsData.transactions || []);
        setStats(statsData.stats || null);
        console.log(
          "✅ Transaction data fetched:",
          transactionsData.transactions.length,
          "transactions"
        );
      } catch (err) {
        console.error("❌ Error fetching transactions:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load transactions"
        );
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [user?.id, filterType]
  );

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      fetchTransactionData();
    }
  }, [isAuthenticated, user?.id, fetchTransactionData]);

  const handleRefresh = () => {
    fetchTransactionData(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-24">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
          <p className="text-white/70">Loading transactions...</p>
        </div>
      </div>
    );
  }

  return (
      <div className="relative min-h-screen pt-24 px-6 pb-20">
        <div className="mx-auto w-full max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex items-center justify-between"
        >
          <h1 className="text-3xl font-bold text-white">Transaction History</h1>
          <div className="flex items-center gap-3">
            {/* Filter Toggle */}
            <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
              <button
                onClick={() => setFilterType("all")}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm transition-all cursor-pointer",
                  filterType === "all"
                    ? "bg-white/15 text-white"
                    : "text-white/60 hover:text-white"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterType("buy")}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm transition-all cursor-pointer",
                  filterType === "buy"
                    ? "bg-green-500/20 text-green-400"
                    : "text-white/60 hover:text-white"
                )}
              >
                Buys
              </button>
              <button
                onClick={() => setFilterType("sell")}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm transition-all",
                  filterType === "sell"
                    ? "bg-red-500/20 text-red-400"
                    : "text-white/60 hover:text-white"
                )}
              >
                Sells
              </button>
            </div>

            <Button
              onClick={handleRefresh}
              disabled={isRefreshing || loading}
              variant="ghost"
              size="sm"
              className="h-10 border border-white/10 bg-white/5 px-4 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
            >
              <RefreshCw
                className={`h-5 w-5 ${isRefreshing ? "animate-spin" : ""}`}
              />
              <span className="ml-2 hidden sm:inline">
                {isRefreshing ? "Refreshing..." : "Refresh"}
              </span>
            </Button>
          </div>
        </motion.div>

        {error && (
          <div className="mb-8 rounded-3xl border border-red-500/20 bg-red-500/5 p-8 text-center">
            <p className="text-red-400">⚠️ {error}</p>
            <p className="mt-2 text-sm text-white/50">
              Please try refreshing or check your connection.
            </p>
          </div>
        )}

        {loading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-32 animate-pulse rounded-3xl border border-white/10 bg-white/5"
              />
            ))}
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                  className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 text-white/70">
                    <ArrowUpRight className="h-5 w-5 text-green-400" />
                    <span className="text-sm">Total Buys</span>
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">
                    {stats.totalBuys}
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    {parseFloat(stats.totalBuyVolume).toFixed(4)} SOL
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 text-white/70">
                    <ArrowDownRight className="h-5 w-5 text-red-400" />
                    <span className="text-sm">Total Sells</span>
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">
                    {stats.totalSells}
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    {parseFloat(stats.totalSellVolume).toFixed(4)} SOL
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl"
                >
                  <div className="flex items-center gap-3 text-white/70">
                    <Filter className="h-5 w-5 text-purple-400" />
                    <span className="text-sm">Total Volume</span>
                  </div>
                  <div className="mt-3 text-2xl font-bold text-white">
                    {parseFloat(stats.totalVolume).toFixed(4)} SOL
                  </div>
                  <div className="mt-1 text-sm text-white/50">
                    Fees: {parseFloat(stats.totalFees).toFixed(6)} SOL
                  </div>
                </motion.div>
              </div>
            )}

            {/* Transactions List */}
            {transactions.length > 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
                className="overflow-hidden rounded-3xl border border-white/10 bg-black/60 backdrop-blur-xl"
              >
                <ul className="divide-y divide-white/10">
                  {transactions.map((tx) => (
                    <li
                      key={tx.transactionId}
                      className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/5"
                    >
                      <div className="flex items-center gap-4">
                        {/* Type Icon */}
                        <div
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full",
                            tx.type === "buy"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          )}
                        >
                          {tx.type === "buy" ? (
                            <ArrowUpRight className="h-5 w-5" />
                          ) : (
                            <ArrowDownRight className="h-5 w-5" />
                          )}
                        </div>

                        {/* Post Info */}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">
                              {tx.type === "buy" ? "Bought" : "Sold"} {tx.amount}{" "}
                              {tx.postTokenSymbol}
                            </span>
                          </div>
                          <div className="text-sm text-white/60">
                            {tx.postTitle && tx.postTitle.length > 40
                              ? tx.postTitle.slice(0, 40) + "..."
                              : tx.postTitle}
                          </div>
                          <div className="text-xs text-white/40">
                            {formatDate(tx.createdAt)} • {tx.postSubreddit}
                          </div>
                        </div>
                      </div>

                      {/* Transaction Details */}
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <div
                            className={cn(
                              "font-semibold",
                              tx.type === "buy"
                                ? "text-red-400"
                                : "text-green-400"
                            )}
                          >
                            {tx.type === "buy" ? "-" : "+"}
                            {parseFloat(tx.totalValue).toFixed(6)} SOL
                          </div>
                          <div className="text-xs text-white/50">
                            @ {parseFloat(tx.pricePerToken).toFixed(6)} SOL
                          </div>
                        </div>

                        {/* Solscan Link */}
                        <a
                          href={`https://solscan.io/tx/${tx.signature}?cluster=devnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 transition-colors hover:text-white"
                          title="View on Solscan"
                        >
                          <ExternalLink className="h-5 w-5" />
                        </a>
                      </div>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ) : (
              <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
                <p className="text-xl text-white/70">📜 No transactions yet</p>
                <p className="mt-2 text-sm text-white/50">
                  Your trading history will appear here once you make your first
                  trade!
                </p>
              </div>
            )}
          </>
        )}
        </div>
      </div>
  );
}

