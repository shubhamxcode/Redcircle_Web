import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchWithAuth } from "@/lib/auth";
import { motion } from "motion/react";
import { ArrowUpRight, ArrowDownRight, Filter, ExternalLink } from "lucide-react";
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

export default function TransactionsPanel() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "buy" | "sell">("all");

  const fetchTransactionData = useCallback(
    async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
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
      }
    },
    [user?.id, filterType]
  );

  useEffect(() => {
    if (user?.id) {
      fetchTransactionData();
    }
  }, [user?.id, fetchTransactionData]);


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

  return (
    <div className="w-full">
      <div className="mb-4 sm:mb-6 md:mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-white">Transaction History</h1>
        </div>
        
        {/* Filter Toggle */}
        <div className="flex items-center gap-1 sm:gap-1.5 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-0.5 sm:p-1">
          <button
            onClick={() => setFilterType("all")}
            className={cn(
              "rounded-lg sm:rounded-xl px-3 sm:px-3 md:px-4 py-2 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm transition-all cursor-pointer touch-manipulation",
              filterType === "all"
                ? "bg-white/15 text-white"
                : "text-white/60 hover:text-white active:bg-white/10"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            All
          </button>
          <button
            onClick={() => setFilterType("buy")}
            className={cn(
              "rounded-lg sm:rounded-xl px-3 sm:px-3 md:px-4 py-2 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm transition-all cursor-pointer touch-manipulation",
              filterType === "buy"
                ? "bg-green-500/20 text-green-400"
                : "text-white/60 hover:text-white active:bg-white/10"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Buys
          </button>
          <button
            onClick={() => setFilterType("sell")}
            className={cn(
              "rounded-lg sm:rounded-xl px-3 sm:px-3 md:px-4 py-2 sm:py-1.5 md:py-2 text-[10px] sm:text-xs md:text-sm transition-all cursor-pointer touch-manipulation",
              filterType === "sell"
                ? "bg-red-500/20 text-red-400"
                : "text-white/60 hover:text-white active:bg-white/10"
            )}
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            Sells
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 sm:mb-6 md:mb-8 rounded-2xl sm:rounded-3xl border border-red-500/20 bg-red-500/5 p-4 sm:p-6 md:p-8 text-center">
          <p className="text-red-400 text-xs sm:text-sm md:text-base">⚠️ {error}</p>
          <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs md:text-sm text-white/50">
            Please try refreshing or check your connection.
          </p>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 sm:h-24 md:h-32 animate-pulse rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5"
            />
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          {stats && (
            <div className="mb-4 sm:mb-6 md:mb-8 grid grid-cols-2 gap-2 sm:gap-3 md:gap-4 lg:grid-cols-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 md:p-6 backdrop-blur"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 text-white/60">
                  <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4 text-green-400" />
                  <span className="text-[10px] sm:text-xs md:text-sm">Total Buys</span>
                </div>
                <p className="mt-1.5 sm:mt-2 text-base sm:text-xl md:text-2xl font-bold text-white">
                  {stats.totalBuys}
                </p>
                <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] md:text-xs text-white/40">
                  {parseFloat(stats.totalBuyVolume).toFixed(2)} SOL
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 md:p-6 backdrop-blur"
              >
                <div className="flex items-center gap-1.5 sm:gap-2 text-white/60">
                  <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4 text-red-400" />
                  <span className="text-[10px] sm:text-xs md:text-sm">Total Sells</span>
                </div>
                <p className="mt-1.5 sm:mt-2 text-base sm:text-xl md:text-2xl font-bold text-white">
                  {stats.totalSells}
                </p>
                <p className="mt-0.5 sm:mt-1 text-[9px] sm:text-[10px] md:text-xs text-white/40">
                  {parseFloat(stats.totalSellVolume).toFixed(2)} SOL
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="rounded-2xl sm:rounded-3xl border border-white/10 bg-black/60 p-3 sm:p-4 md:p-6 backdrop-blur-xl col-span-2 lg:col-span-1"
              >
                <div className="flex items-center gap-2 sm:gap-3 text-white/70">
                  <Filter className="h-3 w-3 sm:h-4 sm:w-4 md:h-5 md:w-5 text-purple-400" />
                  <span className="text-[10px] sm:text-xs md:text-sm">Total Volume</span>
                </div>
                <div className="mt-1.5 sm:mt-2 md:mt-3 text-base sm:text-xl md:text-2xl font-bold text-white">
                  {parseFloat(stats.totalVolume).toFixed(2)} <span className="text-xs sm:text-sm">SOL</span>
                </div>
                <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs md:text-sm text-white/50">
                  Fees: {parseFloat(stats.totalFees).toFixed(4)} SOL
                </div>
              </motion.div>
            </div>
          )}

          {/* Transactions List */}
          {transactions.length > 0 ? (
            <div className="overflow-hidden rounded-xl sm:rounded-2xl border border-white/10 bg-white/5">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px]">
                  <thead className="border-b border-white/10 bg-white/5">
                    <tr>
                      <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-left text-[10px] sm:text-xs md:text-sm font-semibold text-white">Transaction</th>
                      <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-[10px] sm:text-xs md:text-sm font-semibold text-white">Amount</th>
                      <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-[10px] sm:text-xs md:text-sm font-semibold text-white">Price</th>
                      <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-[10px] sm:text-xs md:text-sm font-semibold text-white">Total</th>
                      <th className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-[10px] sm:text-xs md:text-sm font-semibold text-white">Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((tx, index) => (
                      <motion.tr
                        key={tx.transactionId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-white/5 hover:bg-white/5"
                      >
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-full flex-shrink-0",
                                tx.type === "buy"
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-red-500/20 text-red-400"
                              )}
                            >
                              {tx.type === "buy" ? (
                                <ArrowUpRight className="h-3 w-3 sm:h-4 sm:w-4" />
                              ) : (
                                <ArrowDownRight className="h-3 w-3 sm:h-4 sm:w-4" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-white text-[10px] sm:text-xs md:text-sm line-clamp-1">
                                {tx.postTitle}
                              </p>
                              <p className="text-[9px] sm:text-[10px] md:text-xs text-white/50">
                                {tx.type === "buy" ? "Bought" : "Sold"} • r/{tx.postSubreddit}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-white text-[10px] sm:text-xs md:text-sm">
                          {tx.amount} {tx.postTokenSymbol}
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-white/70 text-[10px] sm:text-xs md:text-sm">
                          {parseFloat(tx.pricePerToken).toFixed(6)}
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right">
                          <div
                            className={cn(
                              "font-medium text-[10px] sm:text-xs md:text-sm",
                              tx.type === "buy" ? "text-red-400" : "text-green-400"
                            )}
                          >
                            {tx.type === "buy" ? "-" : "+"}
                            {parseFloat(tx.totalValue).toFixed(4)} SOL
                          </div>
                        </td>
                        <td className="px-2 sm:px-4 md:px-6 py-2 sm:py-3 md:py-4 text-right text-white/70 text-[10px] sm:text-xs md:text-sm">
                          <div className="flex items-center justify-end gap-2">
                            <span>{formatDate(tx.createdAt)}</span>
                            <a
                              href={`https://solscan.io/tx/${tx.signature}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white/40 transition-colors hover:text-white hidden sm:inline-block"
                              title="View on Solscan"
                            >
                              <ExternalLink className="h-3 w-3 sm:h-4 sm:w-4" />
                            </a>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl sm:rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 md:p-12 text-center">
              <p className="text-base sm:text-lg md:text-xl text-white/70">📜 No transactions yet</p>
              <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-white/50">
                Your trading history will appear here once you make your first
                trade!
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

