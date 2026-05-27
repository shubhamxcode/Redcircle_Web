import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "@tanstack/react-router";
import { Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { TrendingUp, Coins, Users, AlertCircle, ArrowRight, Rocket, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import { fetchWithAuth, getApiUrl } from "@/lib/auth";

interface RedditPostPreview {
  redditPostId: string;
  title: string;
  author: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  thumbnail?: string;
  url: string;
  content?: string;
  createdAt: string;
  age: string;
}

interface Quote {
  partner?: { name: string; feeWalletAddress: string };
  launchCost?: { requiredSol: number; uploadPriceSol: number; transactionFeeBufferSol: number };
  fees?: { totalTradingFeePercentage: number; orynthFeePercentage: number; partnerFeePercentage: number };
}

type LaunchStep = "idle" | "fetching" | "previewing" | "quoting" | "preparing" | "signing" | "submitting" | "polling" | "done" | "error";

const STEP_LABELS: Record<LaunchStep, string> = {
  idle:       "Start",
  fetching:   "Fetching post…",
  previewing: "Ready to configure",
  quoting:    "Getting quote…",
  preparing:  "Preparing launch…",
  signing:    "Sign with wallet…",
  submitting: "Submitting to chain…",
  polling:    "Confirming on-chain…",
  done:       "Launched!",
  error:      "Error",
};

export default function LaunchPanel() {
  const { user } = useAuth();
  const { publicKey, signTransaction, connected } = useWallet();
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [postPreview, setPostPreview] = useState<RedditPostPreview | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep] = useState<LaunchStep>("idle");
  const [error, setError] = useState("");
  const [launchId, setLaunchId] = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);

  // Auto-fill token name/symbol from post
  useEffect(() => {
    if (!postPreview) return;
    const words = postPreview.title.split(" ").slice(0, 3).join(" ");
    setTokenName(words.slice(0, 32));
    setTokenSymbol(
      postPreview.subreddit.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10)
    );
  }, [postPreview]);

  // Poll for confirmation
  useEffect(() => {
    if (step !== "polling" || !launchId) return;
    const interval = setInterval(async () => {
      try {
        const apiUrl = getApiUrl();
        const res = await fetch(`${apiUrl}/api/launches/${launchId}/status`);
        const data = await res.json();
        if (data.launch?.status === "confirmed") {
          setMintAddress(data.launch.mintAddress);
          setStep("done");
          clearInterval(interval);
        } else if (data.launch?.status === "failed") {
          setError("Launch failed on-chain. Please try again.");
          setStep("error");
          clearInterval(interval);
        }
      } catch { /* continue polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [step, launchId]);

  const handleFetchPost = async () => {
    if (!url) return;
    setError("");
    setStep("fetching");
    setPostPreview(null);
    setQuote(null);

    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/posts/fetch-reddit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch Reddit post");
      setPostPreview(data.post);
      setStep("previewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch post");
      setStep("idle");
    }
  };

  const handleGetQuote = async () => {
    if (!tokenName || !tokenSymbol) return;
    setStep("quoting");
    try {
      const apiUrl = getApiUrl();
      const res = await fetch(`${apiUrl}/api/launches/quote?tokenName=${encodeURIComponent(tokenName)}&tokenSymbol=${encodeURIComponent(tokenSymbol)}`);
      const data = await res.json();
      setQuote(data.quote ?? {});
      setStep("previewing");
    } catch {
      setQuote({});
      setStep("previewing");
    }
  };

  const handleLaunch = async () => {
    if (!postPreview || !connected || !publicKey || !signTransaction) {
      setError("Connect your wallet first");
      return;
    }
    if (!user?.id) {
      navigate({ to: "/signin", search: { redirect: "/launch" } });
      return;
    }

    setError("");

    try {
      // Step 1: Prepare on backend (Orynth prepare + poolCreator signing)
      setStep("preparing");
      const prepRes = await fetchWithAuth(`/api/launches/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redditPostId:    postPreview.redditPostId,
          redditUrl:       postPreview.url,
          redditTitle:     postPreview.title,
          redditAuthor:    postPreview.author,
          redditThumbnail: postPreview.thumbnail,
          payerWalletAddress: publicKey.toBase58(),
          tokenName,
          tokenSymbol: tokenSymbol.toUpperCase(),
          description,
          imageUrl: postPreview.thumbnail,
        }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepData.error || "Failed to prepare launch");

      const { launchId: newLaunchId, partiallySignedTxHex } = prepData;
      setLaunchId(newLaunchId);

      // Step 2: Payer signs the partially-signed tx
      setStep("signing");
      const txBuffer = Buffer.from(partiallySignedTxHex, "hex");
      const tx = Transaction.from(txBuffer);

      tx.feePayer = publicKey;

      const signedTx = await signTransaction(tx);
      const signedTxHex = Buffer.from(signedTx.serialize({ requireAllSignatures: false })).toString("hex");

      // Step 3: Submit fully-signed tx to backend → Orynth
      setStep("submitting");
      const subRes = await fetchWithAuth(`/api/launches/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchId: newLaunchId, signedTxHex }),
      });
      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error || "Failed to submit launch");

      // Step 4: Poll for confirmation
      setStep("polling");
      toast.success("Transaction submitted! Waiting for confirmation…");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setStep("error");
    }
  };

  const reset = () => {
    setUrl("");
    setPostPreview(null);
    setQuote(null);
    setTokenName("");
    setTokenSymbol("");
    setDescription("");
    setStep("idle");
    setError("");
    setLaunchId(null);
    setMintAddress(null);
  };

  const isBusy = ["fetching", "quoting", "preparing", "signing", "submitting", "polling"].includes(step);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Done state */}
      <AnimatePresence>
        {step === "done" && mintAddress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl border border-green-500/20 bg-green-500/5 p-8 text-center space-y-4"
          >
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
            <h2 className="text-xl font-semibold text-white">Token Launched!</h2>
            <p className="text-white/60 text-sm">Mint: <span className="font-mono text-white/80">{mintAddress}</span></p>
            <div className="flex justify-center gap-3">
              <a
                href={`https://solscan.io/token/${mintAddress}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                View on Solscan
              </a>
              <Button onClick={reset} variant="ghost" className="text-white/60 hover:text-white">
                Launch Another
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {step !== "done" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative z-10 bg-neutral-900/50 border border-white/10 rounded-2xl overflow-hidden"
        >
          <div className="p-6 sm:p-8 md:p-10 space-y-8">

            {/* Step 1 — URL */}
            <div className="space-y-4">
              <label className="block text-sm font-medium text-white/70 ml-1">Reddit Post URL</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  value={url}
                  onChange={(e) => { setUrl(e.target.value); setPostPreview(null); setError(""); setStep("idle"); }}
                  placeholder="https://reddit.com/r/..."
                  disabled={isBusy}
                  className="flex-1 bg-neutral-950/50 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/30 transition-all text-sm disabled:opacity-50"
                />
                <Button
                  type="button"
                  onClick={handleFetchPost}
                  disabled={!url || isBusy}
                  className="h-12 sm:h-auto px-6 rounded-lg bg-white text-black hover:bg-white/90 font-medium transition-all disabled:opacity-50"
                >
                  {step === "fetching"
                    ? <Loader2 className="w-5 h-5 animate-spin" />
                    : <div className="flex items-center gap-2"><span>Fetch</span><ArrowRight className="w-4 h-4" /></div>
                  }
                </Button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-sm bg-red-500/5 border border-red-500/10 px-4 py-3 rounded-lg"
                >
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>

            <AnimatePresence>
              {postPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-8 overflow-hidden"
                >
                  <div className="h-px w-full bg-white/5" />

                  <div className="grid md:grid-cols-2 gap-8">
                    {/* Left — post preview + token metadata */}
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">1</span>
                          Post Preview
                        </h3>
                        <div className="bg-black/40 border border-white/10 rounded-xl p-4">
                          <div className="flex gap-3">
                            {postPreview.thumbnail && (
                              <img src={postPreview.thumbnail} alt="Thumbnail" className="w-16 h-16 rounded-lg object-cover bg-neutral-800 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white font-medium leading-snug mb-1 line-clamp-2 text-sm">{postPreview.title}</h4>
                              <div className="flex items-center gap-2 text-xs text-white/40">
                                <span className="text-white/60">r/{postPreview.subreddit}</span>
                                <span>•</span>
                                <span>u/{postPreview.author}</span>
                              </div>
                              <div className="mt-2 flex gap-3 text-xs text-white/50">
                                <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{postPreview.upvotes.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{postPreview.comments.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h3 className="text-sm font-medium text-white/70 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">2</span>
                          Token Details
                        </h3>
                        <input
                          value={tokenName}
                          onChange={(e) => setTokenName(e.target.value.slice(0, 32))}
                          placeholder="Token name"
                          className="w-full bg-neutral-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all"
                        />
                        <input
                          value={tokenSymbol}
                          onChange={(e) => setTokenSymbol(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10))}
                          placeholder="SYMBOL"
                          className="w-full bg-neutral-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all font-mono"
                        />
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Why should people trade this token?"
                          rows={2}
                          className="w-full bg-neutral-950/50 border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-all resize-none"
                        />
                        <Button
                          type="button"
                          onClick={handleGetQuote}
                          disabled={!tokenName || !tokenSymbol || isBusy}
                          variant="ghost"
                          className="text-xs text-white/50 hover:text-white border border-white/10 hover:border-white/20 w-full"
                        >
                          {step === "quoting" ? <Loader2 className="w-3 h-3 animate-spin mr-2" /> : null}
                          {step === "quoting" ? "Getting quote…" : "Get Launch Quote"}
                        </Button>
                      </div>
                    </div>

                    {/* Right — fee info + wallet */}
                    <div className="space-y-6">
                      {/* Fee breakdown */}
                      <div>
                        <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">3</span>
                          Fee Model
                        </h3>
                        <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-2 text-xs">
                          {quote?.launchCost?.requiredSol != null && (
                            <div className="flex justify-between text-white/70 border-b border-white/5 pb-2 mb-2">
                              <span>Required launch cost</span>
                              <span className="font-mono text-white">{quote.launchCost.requiredSol} SOL</span>
                            </div>
                          )}
                          <div className="flex justify-between text-white/50">
                            <span>Total trading fee</span>
                            <span className="font-mono">2.50%</span>
                          </div>
                          <div className="flex justify-between text-white/40 pl-3">
                            <span>└ Orynth + Meteora</span>
                            <span className="font-mono">1.16%</span>
                          </div>
                          <div className="flex justify-between text-orange-400/80 pl-3">
                            <span>└ Partner (Redcircle)</span>
                            <span className="font-mono">1.34%</span>
                          </div>
                          <div className="flex justify-between text-white/30 pl-6">
                            <span>├ Creator payout</span>
                            <span className="font-mono">0.67%</span>
                          </div>
                          <div className="flex justify-between text-white/30 pl-6">
                            <span>└ Platform</span>
                            <span className="font-mono">0.67%</span>
                          </div>
                          <p className="text-white/30 pt-2 border-t border-white/5">
                            You pay Solana launch costs. You receive no trading fees.
                          </p>
                        </div>
                      </div>

                      {/* Wallet connection */}
                      <div>
                        <h3 className="text-sm font-medium text-white/70 mb-3 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center text-[10px]">4</span>
                          Payer Wallet
                        </h3>
                        <div className="flex flex-col gap-2">
                          <WalletMultiButton className="!rounded-lg !h-10 !text-sm !w-full !justify-center" />
                          {connected && publicKey && (
                            <p className="text-xs text-white/40 font-mono truncate text-center">{publicKey.toBase58()}</p>
                          )}
                        </div>
                      </div>

                      {/* Status indicator while busy */}
                      {isBusy && step !== "previewing" && (
                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-lg px-4 py-3">
                          <Loader2 className="w-4 h-4 animate-spin text-orange-400 shrink-0" />
                          <span className="text-sm text-white/70">{STEP_LABELS[step]}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Launch button */}
                  <div className="pt-4 flex flex-col-reverse sm:flex-row justify-end gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={reset}
                      disabled={isBusy}
                      className="text-white/60 hover:text-white hover:bg-white/5 rounded-lg"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      onClick={handleLaunch}
                      disabled={isBusy || !connected || !tokenName || !tokenSymbol || !user}
                      className="bg-white text-black hover:bg-white/90 px-8 py-4 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isBusy ? (
                        <div className="flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{STEP_LABELS[step]}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Rocket className="w-4 h-4" />
                          <span>Launch Token</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </div>
  );
}
