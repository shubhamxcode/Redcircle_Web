import { useEffect, useMemo, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, TrendingUp, TrendingDown, Wallet, ArrowRightLeft } from "lucide-react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import { PublicKey, VersionedTransaction } from "@solana/web3.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import type { FeedPost } from "@/components/FeedCard";
import { cn } from "@/lib/utils";
import { fetchWithAuth } from "@/lib/auth";
import { Buffer } from "buffer";

type TradeType = "buy" | "sell";

(window as typeof window & { Buffer: typeof Buffer }).Buffer = Buffer;

type TradingModalProps = {
  post: FeedPost;
  isOpen: boolean;
  onClose: () => void;
};

type FeeMetrics = {
  creator: number;
  curator: number;
  growth: number;
  platform: number;
  unclaimedCreator: number;
  unclaimedCurator: number;
  unclaimedGrowth: number;
};

type TradingStats = {
  currentPrice: number;
  totalSupply: number;
  soldSupply: number;
  availableSupply: number;
  totalVolume: number;
  marketCap: number;
  holders: number;
  poolStatus: string;
  poolModel: string;
  pool?: string;
  marketState?: string;
  tokenMint?: string;
  solReserve?: number;
  tokenReserve?: number;
  totalFees?: number;
  totalTrades?: number;
  fees: FeeMetrics;
};

type TradeQuote = {
  side: TradeType;
  poolModel: string;
  amountIn: number;
  amountOut: number;
  minimumAmountOut: number;
  priceSolPerToken: number;
  priceLamportsPerToken: string;
  slippageBps: number;
  fees: {
    total: number;
    platform: number;
    creator: number;
    curator: number;
    growth: number;
  };
};

export default function TradingModal({ post, isOpen, onClose }: TradingModalProps) {
  const { connection } = useConnection();
  const { connected, publicKey, sendTransaction } = useWallet();
  const { setVisible } = useWalletModal();
  const [tradeType, setTradeType] = useState<TradeType>("buy");
  const [amount, setAmount] = useState("");
  const [slippageBps, setSlippageBps] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tradingStats, setTradingStats] = useState<TradingStats | null>(null);
  const [quote, setQuote] = useState<TradeQuote | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [solBalance, setSolBalance] = useState<number | null>(null);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);

  const numericAmount = useMemo(() => parseFloat(amount) || 0, [amount]);

  const fetchTradingStats = async () => {
    setLoadingStats(true);
    try {
      const response = await fetchWithAuth(`/api/trading/stats/${post.id}`);
      const data = await response.json();
      if (data.success) setTradingStats(data.stats);
    } catch (error) {
      console.error("Failed to fetch trading stats:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !post.id) return;
    void fetchTradingStats();
  }, [isOpen, post.id]);

  useEffect(() => {
    if (!connected || !publicKey || !isOpen) {
      setSolBalance(null);
      setTokenBalance(null);
      return;
    }

    let cancelled = false;
    async function fetchBalances() {
      const owner = publicKey;
      if (!owner) return;

      const lamports = await connection.getBalance(owner);
      if (!cancelled) setSolBalance(lamports / 1_000_000_000);

      const mint = tradingStats?.tokenMint || post.tokenMintAddress;
      if (!mint) return;
      const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
        mint: new PublicKey(mint),
      });
      const balance = accounts.value.reduce((sum, account) => {
        const uiAmount =
          account.account.data.parsed.info.tokenAmount.uiAmount || 0;
        return sum + uiAmount;
      }, 0);
      if (!cancelled) setTokenBalance(balance);
    }

    void fetchBalances().catch((error) => {
      console.error("Failed to fetch wallet balances:", error);
    });

    return () => {
      cancelled = true;
    };
  }, [connected, connection, publicKey, isOpen, tradingStats?.tokenMint, post.tokenMintAddress]);

  useEffect(() => {
    if (!isOpen || numericAmount <= 0) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingQuote(true);
      try {
        const response = await fetchWithAuth("/api/trading/quote", {
          method: "POST",
          signal: controller.signal,
          body: JSON.stringify({
            postId: post.id,
            side: tradeType,
            amount: numericAmount,
            slippageBps,
          }),
        });
        const data = await response.json();
        if (!response.ok || !data.success) {
          throw new Error(data.details || data.error || "Failed to quote trade");
        }
        setQuote(data.quote);
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("Failed to quote trade:", error);
          setQuote(null);
        }
      } finally {
        if (!controller.signal.aborted) setLoadingQuote(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [isOpen, post.id, tradeType, numericAmount, slippageBps]);

  const handleConnectWallet = () => setVisible(true);

  const handleTrade = async () => {
    if (!connected || !publicKey) {
      handleConnectWallet();
      return;
    }

    if (numericAmount <= 0) {
      toast.error("Invalid amount", {
        description: "Enter a positive amount to trade.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const endpoint = tradeType === "buy" ? "/api/trading/buy" : "/api/trading/sell";
      const response = await fetchWithAuth(endpoint, {
        method: "POST",
        body: JSON.stringify({
          postId: post.id,
          amountInSOL: tradeType === "buy" ? numericAmount : undefined,
          amount: tradeType === "sell" ? numericAmount : undefined,
          walletAddress: publicKey.toBase58(),
          slippageBps,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.details || data.error || "Transaction failed");
      }

      const txBytes = Buffer.from(data.transaction, "base64");
      const transaction = VersionedTransaction.deserialize(txBytes);
      const signature = await sendTransaction(transaction, connection, {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      const latestBlockhash = await connection.getLatestBlockhash();
      const confirmation = await connection.confirmTransaction(
        {
          signature,
          blockhash: latestBlockhash.blockhash,
          lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      await fetchWithAuth("/api/trading/confirm", {
        method: "POST",
        body: JSON.stringify({
          signature,
          postId: post.id,
          type: tradeType,
          amount: data.quote?.amountOut || quote?.amountOut || numericAmount,
          price: tradeType === "buy" ? numericAmount : data.quote?.amountOut || 0,
          walletAddress: publicKey.toBase58(),
          quote: data.quote,
        }),
      });

      const executedQuote = data.quote as TradeQuote;
      toast.success(tradeType === "buy" ? "Purchase successful" : "Sale successful", {
        description:
          tradeType === "buy"
            ? `${executedQuote.amountOut.toFixed(6)} tokens for ${numericAmount.toFixed(6)} SOL`
            : `${numericAmount.toFixed(6)} tokens for ${executedQuote.amountOut.toFixed(6)} SOL`,
        action: {
          label: "View on Solscan",
          onClick: () =>
            window.open(
              `https://solscan.io/tx/${signature}?cluster=devnet`,
              "_blank",
              "noopener,noreferrer"
            ),
        },
      });

      await fetchTradingStats();
      setAmount("");
      onClose();
    } catch (error) {
      console.error("Trade error:", error);
      const description =
        error instanceof Error && error.message.includes("User rejected")
          ? "Transaction was cancelled."
          : error instanceof Error
            ? error.message
            : "Please try again.";
      toast.error("Trade failed", { description });
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputLabel = tradeType === "buy" ? "SOL Amount" : "Token Amount";
  const outputLabel = tradeType === "buy" ? "Estimated Tokens" : "Estimated SOL";
  const walletShort = publicKey
    ? `${publicKey.toBase58().slice(0, 4)}...${publicKey.toBase58().slice(-4)}`
    : "";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />

          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", duration: 0.5 }}
              className="relative max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/20 bg-black/95 shadow-2xl backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-xl border border-white/10 bg-white/5 p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="p-6">
                <div className="mb-6">
                  <div className="mb-3 flex items-center gap-3">
                    <div className="rounded-xl border border-white/20 bg-white/5 p-2.5">
                      <ArrowRightLeft className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Trade Token</h2>
                      <p className="text-sm text-white/60">
                        {tradingStats?.poolModel || "RedCircle Protocol"} · Devnet
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h3 className="mb-2 line-clamp-2 text-sm font-semibold text-white">
                      {post.title}
                    </h3>
                    <div className="flex items-center gap-3 text-xs text-white/60">
                      <span>r/{post.subreddit}</span>
                      <span>u/{post.author}</span>
                    </div>

                    {loadingStats ? (
                      <div className="mt-3 text-xs text-white/50">Loading stats...</div>
                    ) : tradingStats ? (
                      <div className="mt-4 grid grid-cols-2 gap-3 text-xs sm:grid-cols-3">
                        <Metric label="Status" value={tradingStats.poolStatus} />
                        <Metric label="Model" value={tradingStats.poolModel} />
                        <Metric label="Price" value={`${tradingStats.currentPrice.toFixed(6)} SOL`} />
                        <Metric label="Tokens Sold" value={tradingStats.soldSupply.toLocaleString()} />
                        <Metric label="SOL Reserve" value={`${(tradingStats.solReserve || 0).toFixed(4)} SOL`} />
                        <Metric label="Token Reserve" value={(tradingStats.tokenReserve || 0).toLocaleString()} />
                        <Metric label="Volume" value={`${tradingStats.totalVolume.toFixed(3)} SOL`} />
                        <Metric label="Fees" value={`${(tradingStats.totalFees || 0).toFixed(3)} SOL`} />
                        <Metric label="Trades" value={(tradingStats.totalTrades || 0).toLocaleString()} />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mb-6">
                  <div className="flex gap-2 rounded-xl border border-white/10 bg-white/5 p-1">
                    <TradeTab
                      active={tradeType === "buy"}
                      icon={<TrendingUp className="mx-auto mb-1 h-5 w-5" />}
                      label="Buy"
                      onClick={() => setTradeType("buy")}
                      tone="buy"
                    />
                    <TradeTab
                      active={tradeType === "sell"}
                      icon={<TrendingDown className="mx-auto mb-1 h-5 w-5" />}
                      label="Sell"
                      onClick={() => setTradeType("sell")}
                      tone="sell"
                    />
                  </div>
                </div>

                <div className="mb-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-white/80">{inputLabel}</label>
                    <span className="text-xs text-white/50">
                      {tradeType === "buy"
                        ? `SOL: ${solBalance == null ? "--" : solBalance.toFixed(4)}`
                        : `Tokens: ${tokenBalance == null ? "--" : tokenBalance.toFixed(4)}`}
                    </span>
                  </div>
                  <Input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="h-14 rounded-xl border-white/20 bg-white/5 text-lg text-white placeholder:text-white/30"
                    min="0"
                    step={tradeType === "buy" ? "0.001" : "0.01"}
                  />

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <label className="text-sm font-medium text-white/80">Slippage</label>
                      <span className="text-xs text-white/60">{(slippageBps / 100).toFixed(2)}%</span>
                    </div>
                    <div className="flex gap-2">
                      {[50, 100, 300].map((value) => (
                        <button
                          key={value}
                          onClick={() => setSlippageBps(value)}
                          className={cn(
                            "flex-1 rounded-lg border py-2 text-xs transition-colors",
                            slippageBps === value
                              ? "border-white/30 bg-white/15 text-white"
                              : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          )}
                        >
                          {(value / 100).toFixed(value === 50 ? 1 : 0)}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {numericAmount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mb-6 space-y-2 rounded-xl border border-white/10 bg-white/5 p-4"
                  >
                    <h4 className="mb-3 text-sm font-semibold text-white/80">
                      Order Summary
                    </h4>
                    <SummaryRow label="Input" value={`${numericAmount.toFixed(6)} ${tradeType === "buy" ? "SOL" : "tokens"}`} />
                    <SummaryRow
                      label={outputLabel}
                      value={
                        loadingQuote
                          ? "Quoting..."
                          : quote
                            ? `${quote.amountOut.toFixed(6)} ${tradeType === "buy" ? "tokens" : "SOL"}`
                            : "--"
                      }
                    />
                    <SummaryRow
                      label="Minimum Out"
                      value={
                        quote
                          ? `${quote.minimumAmountOut.toFixed(6)} ${tradeType === "buy" ? "tokens" : "SOL"}`
                          : "--"
                      }
                    />
                    <SummaryRow
                      label="Trading Fee"
                      value={quote ? `${quote.fees.total.toFixed(6)} SOL` : "--"}
                    />
                    <div className="mt-3 border-t border-white/10 pt-3">
                      <SummaryRow
                        label="Price"
                        value={quote ? `${quote.priceSolPerToken.toFixed(9)} SOL` : "--"}
                        strong
                      />
                    </div>
                  </motion.div>
                )}

                {connected ? (
                  <div className="mb-6 rounded-xl border border-green-500/20 bg-green-500/5 p-3">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-green-400" />
                      <div className="text-xs text-white/70">
                        <span className="font-medium text-green-400">Wallet connected:</span> {walletShort}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-6 rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-3">
                    <div className="flex items-center gap-3">
                      <Wallet className="h-5 w-5 text-yellow-400" />
                      <div className="text-xs text-white/70">
                        <span className="font-medium text-yellow-400">Wallet not connected.</span> Connect to trade.
                      </div>
                    </div>
                  </div>
                )}

                {tradingStats?.fees && (
                  <div className="mb-6 grid grid-cols-2 gap-2 text-xs">
                    <Metric label="Creator Fees" value={`${tradingStats.fees.creator.toFixed(4)} SOL`} />
                    <Metric label="Curator Fees" value={`${tradingStats.fees.curator.toFixed(4)} SOL`} />
                    <Metric label="Growth Fees" value={`${tradingStats.fees.growth.toFixed(4)} SOL`} />
                    <Metric label="Platform Fees" value={`${tradingStats.fees.platform.toFixed(4)} SOL`} />
                  </div>
                )}

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={onClose}
                    className="flex-1 rounded-xl border-white/20 bg-white/5 text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleTrade}
                    disabled={isSubmitting || numericAmount <= 0 || (connected && !quote)}
                    className={cn(
                      "flex-1 rounded-xl font-semibold text-white shadow-lg",
                      !connected
                        ? "bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600"
                        : tradeType === "buy"
                          ? "bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                          : "bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600"
                    )}
                  >
                    {isSubmitting
                      ? "Processing..."
                      : !connected
                        ? "Connect Wallet"
                        : `${tradeType === "buy" ? "Buy" : "Sell"} Tokens`}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <div className="text-white/50">{label}</div>
      <div className="mt-1 truncate font-semibold text-white">{value}</div>
    </div>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between text-sm", strong ? "font-semibold" : "text-white/60")}>
      <span className={strong ? "text-white/80" : "text-white/60"}>{label}</span>
      <span className="text-white">{value}</span>
    </div>
  );
}

function TradeTab({
  active,
  icon,
  label,
  onClick,
  tone,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
  tone: "buy" | "sell";
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex-1 rounded-lg px-4 py-3 text-sm font-semibold transition-all",
        active && tone === "buy"
          ? "border border-green-500/30 bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-white shadow-lg shadow-green-500/10"
          : active
            ? "border border-red-500/30 bg-gradient-to-r from-red-500/20 to-pink-500/20 text-white shadow-lg shadow-red-500/10"
            : "text-white/60 hover:text-white"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
