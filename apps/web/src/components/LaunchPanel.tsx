import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useWallet } from "@solana/wallet-adapter-react";
import { useNavigate } from "@tanstack/react-router";
import { Transaction } from "@solana/web3.js";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  TrendingUp, Users, AlertCircle, ArrowRight, Rocket,
  CheckCircle, Loader2, ExternalLink, Terminal, Check,
} from "lucide-react";
import { fetchWithAuth, getApiUrl } from "@/lib/auth";
import { cn } from "@/lib/utils";

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

type LaunchStep =
  | "idle" | "fetching" | "previewing" | "quoting"
  | "preparing" | "signing" | "submitting" | "polling"
  | "done" | "error";

const STAGE_LABELS = ["Fetch", "Configure", "Launch"] as const;

function getActiveStage(step: LaunchStep): number {
  switch (step) {
    case "idle":
    case "fetching":      return 0;
    case "previewing":
    case "quoting":       return 1;
    case "preparing":
    case "signing":
    case "submitting":
    case "polling":
    case "done":          return 2;
    default:              return 0;
  }
}

const STEP_STATUS: Record<LaunchStep, string> = {
  idle:       "> awaiting reddit url_",
  fetching:   "> fetching post metadata…",
  previewing: "> post loaded. configure token details_",
  quoting:    "> fetching launch quote…",
  preparing:  "> preparing transaction…",
  signing:    "> awaiting wallet signature…",
  submitting: "> broadcasting to solana…",
  polling:    "> confirming on-chain…",
  done:       "> launch confirmed ✓",
  error:      "> error encountered.",
};

// Rocket particle positions
const PARTICLES = [
  { x: -40, y: -30, color: "#E8431C" },
  { x: 40,  y: -20, color: "#00FFD1" },
  { x: -25, y: 20,  color: "#FFA500" },
  { x: 35,  y: 25,  color: "#a78bfa" },
  { x: 0,   y: -50, color: "#E8431C" },
  { x: -50, y: 0,   color: "#00FFD1" },
];

export default function LaunchPanel() {
  const { user } = useAuth();
  const { publicKey, signTransaction, connected } = useWallet();
  const navigate = useNavigate();

  const [url, setUrl]               = useState("");
  const [postPreview, setPostPreview] = useState<RedditPostPreview | null>(null);
  const [quote, setQuote]           = useState<Quote | null>(null);
  const [tokenName, setTokenName]   = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [description, setDescription] = useState("");
  const [step, setStep]             = useState<LaunchStep>("idle");
  const [error, setError]           = useState("");
  const [launchId, setLaunchId]     = useState<string | null>(null);
  const [mintAddress, setMintAddress] = useState<string | null>(null);
  const [rocketGone, setRocketGone] = useState(false);


  const activeStage = getActiveStage(step);

  // Default name + symbol from Reddit post context (Gemini suggest-name commented out)
  useEffect(() => {
    if (!postPreview) return;
    setTokenName(postPreview.title.split(" ").slice(0, 3).join(" ").slice(0, 32));
    setTokenSymbol(postPreview.subreddit.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8));
  }, [postPreview]);

  // Poll for confirmation
  useEffect(() => {
    if (step !== "polling" || !launchId) return;
    const interval = setInterval(async () => {
      try {
        const apiUrl = getApiUrl();
        const res  = await fetch(`${apiUrl}/api/launches/${launchId}/status`);
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

  // Trigger rocket-gone after animation completes
  useEffect(() => {
    if (step === "done") {
      const t = setTimeout(() => setRocketGone(true), 1200);
      return () => clearTimeout(t);
    }
    setRocketGone(false);
  }, [step]);

  const handleFetchPost = async () => {
    if (!url) return;
    setError("");
    setStep("fetching");
    setPostPreview(null);
    setQuote(null);
    try {
      const apiUrl = getApiUrl();
      const res  = await fetch(`${apiUrl}/api/posts/fetch-reddit`, {
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
      const res  = await fetch(`${apiUrl}/api/launches/quote?tokenName=${encodeURIComponent(tokenName)}&tokenSymbol=${encodeURIComponent(tokenSymbol)}`);
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
      setStep("preparing");
      const prepRes = await fetchWithAuth(`/api/launches/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redditPostId:       postPreview.redditPostId,
          redditUrl:          postPreview.url,
          redditTitle:        postPreview.title,
          redditAuthor:       postPreview.author,
          redditThumbnail:    postPreview.thumbnail,
          payerWalletAddress: publicKey.toBase58(),
          tokenName,
          tokenSymbol:        tokenSymbol.toUpperCase(),
          description,
          imageUrl:           postPreview.thumbnail,
        }),
      });
      const prepData = await prepRes.json();
      if (!prepRes.ok) throw new Error(prepData.error || "Failed to prepare launch");

      const { launchId: newLaunchId, partiallySignedTxHex } = prepData;
      setLaunchId(newLaunchId);

      setStep("signing");
      const txBuffer = Buffer.from(partiallySignedTxHex, "hex");
      const tx = Transaction.from(txBuffer);
      tx.feePayer = publicKey;
      const signedTx    = await signTransaction(tx);
      const signedTxHex = Buffer.from(signedTx.serialize({ requireAllSignatures: false })).toString("hex");

      setStep("submitting");
      const subRes = await fetchWithAuth(`/api/launches/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ launchId: newLaunchId, signedTxHex }),
      });
      const subData = await subRes.json();
      if (!subRes.ok) throw new Error(subData.error || "Failed to submit launch");

      setStep("polling");
      toast.success("Transaction submitted! Waiting for confirmation…");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Launch failed");
      setStep("error");
    }
  };

  const reset = () => {
    setUrl(""); setPostPreview(null); setQuote(null);
    setTokenName(""); setTokenSymbol(""); setDescription("");
    setStep("idle"); setError(""); setLaunchId(null); setMintAddress(null);
    setRocketGone(false);
  };

  const isBusy = ["fetching", "quoting", "preparing", "signing", "submitting", "polling"].includes(step);

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* ── Success screen ── */}
      <AnimatePresence>
        {step === "done" && mintAddress && (
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-2xl border border-[#00FFD1]/15 bg-black overflow-hidden"
            style={{ boxShadow: "0 0 60px -20px rgba(0,255,209,0.15), inset 0 0 40px -20px rgba(0,255,209,0.04)" }}
          >
            {/* Terminal header */}
            <TerminalHeader />

            <div className="px-8 py-12 flex flex-col items-center gap-6">
              {/* Rocket + particles */}
              <div className="relative h-28 w-28 flex items-center justify-center">
                {!rocketGone && (
                  <motion.div
                    initial={{ y: 0, opacity: 1, rotate: -45 }}
                    animate={{ y: -120, opacity: 0, rotate: -45 }}
                    transition={{ duration: 1, delay: 0.2, ease: "easeIn" }}
                    className="absolute"
                  >
                    <Rocket className="w-14 h-14 text-[#E8431C]" />
                  </motion.div>
                )}
                {PARTICLES.map((p, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
                    animate={{ opacity: [0, 1, 0], scale: [0, 1.2, 0], x: p.x, y: p.y }}
                    transition={{ duration: 0.7, delay: 0.4 + i * 0.08, ease: "easeOut" }}
                    className="absolute w-2 h-2 rounded-full"
                    style={{ background: p.color }}
                  />
                ))}
                <motion.div
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 1.2, type: "spring", stiffness: 200 }}
                >
                  <CheckCircle className="w-14 h-14 text-[#00FFD1]" />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1 }}
                className="text-center space-y-3"
              >
                <h2 className="text-xl font-bold text-white font-mono tracking-wide">TOKEN_LAUNCHED</h2>
                <p className="text-xs text-white/40 font-mono">
                  mint: <span className="text-[#00FFD1]/80 break-all">{mintAddress}</span>
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-2 pt-2">
                  <a
                    href={`https://solscan.io/token/${mintAddress}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg border border-[#00FFD1]/20 bg-[#00FFD1]/5 hover:bg-[#00FFD1]/10 text-[#00FFD1] text-sm font-mono transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Solscan
                  </a>
                  <button
                    onClick={reset}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-sm font-mono transition-all"
                  >
                    Launch Another
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main terminal panel ── */}
      {step !== "done" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="relative rounded-2xl border border-white/[0.08] bg-[#080808] overflow-hidden"
          style={{ boxShadow: "0 0 0 1px rgba(0,255,209,0.03), 0 40px 80px -20px rgba(0,0,0,0.8)" }}
        >
          {/* Terminal header */}
          <TerminalHeader />

          {/* Progress bar */}
          <div className="px-6 pt-5 pb-3">
            <div className="flex items-start gap-0">
              {STAGE_LABELS.map((label, i) => {
                const isDone   = activeStage > i;
                const isActive = activeStage === i;
                return (
                  <div key={label} className="flex items-start flex-1 last:flex-none">
                    <div className="flex flex-col items-center gap-1 shrink-0">
                      <div className={cn(
                        "w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-500",
                        isDone   && "border-[#00FFD1]/60 bg-[#00FFD1]/10 shadow-[0_0_10px_rgba(0,255,209,0.2)]",
                        isActive && "border-[#E8431C]/70 bg-[#E8431C]/10 shadow-[0_0_10px_rgba(232,67,28,0.3)]",
                        !isDone && !isActive && "border-white/10 bg-white/[0.02]",
                      )}>
                        {isDone
                          ? <Check className="w-3 h-3 text-[#00FFD1]" />
                          : <span className={cn("text-[9px] font-mono font-bold", isActive ? "text-[#E8431C]" : "text-white/20")}>{i + 1}</span>
                        }
                      </div>
                      <span className={cn(
                        "text-[9px] font-mono uppercase tracking-widest whitespace-nowrap transition-colors",
                        isDone   && "text-[#00FFD1]/60",
                        isActive && "text-[#E8431C]/80",
                        !isDone && !isActive && "text-white/20",
                      )}>{label}</span>
                    </div>
                    {i < STAGE_LABELS.length - 1 && (
                      <div className="flex-1 mt-3.5 mx-1">
                        <div className="h-px w-full bg-white/[0.05] relative overflow-hidden">
                          <motion.div
                            className="absolute inset-y-0 left-0 bg-[#00FFD1]/40"
                            initial={{ width: "0%" }}
                            animate={{ width: isDone ? "100%" : "0%" }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Terminal status line */}
          <div className="mx-6 mb-1 px-3 py-1.5 rounded-md bg-black/60 border border-white/[0.05] font-mono text-[10px] text-white/30 flex items-center gap-2">
            <Terminal className="w-3 h-3 text-[#00FFD1]/40 shrink-0" />
            <span className={step === "error" ? "text-red-400/70" : ""}>{STEP_STATUS[step]}</span>
            {isBusy && <span className="ml-auto"><Loader2 className="w-3 h-3 animate-spin text-[#E8431C]/60" /></span>}
          </div>

          <div className="p-4 sm:p-6 space-y-6">

            {/* URL input */}
            <div className={`space-y-3 ${!postPreview ? "max-w-xl mx-auto" : ""}`}>
              <label className="block text-[10px] font-mono uppercase tracking-widest text-white/30 ml-0.5">
                Reddit Post URL
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1 flex items-center gap-2 bg-black/60 border border-white/[0.07] rounded-lg px-3 py-2.5 focus-within:border-[#E8431C]/30 focus-within:shadow-[0_0_0_1px_rgba(232,67,28,0.1)] transition-all">
                  <span className="text-[#E8431C]/60 font-mono text-xs shrink-0">›</span>
                  <input
                    value={url}
                    onChange={(e) => { setUrl(e.target.value); setPostPreview(null); setError(""); setStep("idle"); }}
                    placeholder="https://reddit.com/r/..."
                    disabled={isBusy}
                    className="flex-1 bg-transparent text-white/80 placeholder:text-white/15 focus:outline-none text-sm font-mono disabled:opacity-50"
                  />
                </div>
                <button
                  onClick={handleFetchPost}
                  disabled={!url || isBusy}
                  className="h-11 px-5 rounded-lg bg-[#E8431C] hover:bg-[#FF5535] text-black font-mono font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(232,67,28,0.25)]"
                >
                  {step === "fetching"
                    ? <><Loader2 className="w-4 h-4 animate-spin" /> Fetching</>
                    : <><Rocket className="w-4 h-4" /><span>Launch coin</span></>
                  }
                </button>
              </div>

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center gap-2 text-red-400 text-xs bg-red-500/5 border border-red-500/15 px-3 py-2.5 rounded-lg font-mono"
                >
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </motion.div>
              )}
            </div>

            {/* Post preview + config */}
            <AnimatePresence>
              {postPreview && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-6 overflow-hidden"
                >
                  <div className="h-px bg-white/[0.04]" />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Left */}
                    <div className="space-y-5">
                      {/* Post preview */}
                      <div>
                        <SectionLabel n={1} text="Post Preview" />
                        <div className="bg-black/50 border border-white/[0.06] rounded-xl p-3.5 mt-2">
                          <div className="flex gap-3">
                            {postPreview.thumbnail && (
                              <img src={postPreview.thumbnail} alt="" className="w-14 h-14 rounded-lg object-cover bg-neutral-900 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h4 className="text-white/90 font-medium leading-snug mb-1 line-clamp-2 text-sm">{postPreview.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-white/35 font-mono">
                                <span className="text-white/50">r/{postPreview.subreddit}</span>
                                <span>·</span>
                                <span>u/{postPreview.author}</span>
                              </div>
                              <div className="mt-1.5 flex gap-3 text-[10px] text-white/40">
                                <span className="flex items-center gap-1"><TrendingUp className="w-2.5 h-2.5" />{postPreview.upvotes.toLocaleString()}</span>
                                <span className="flex items-center gap-1"><Users className="w-2.5 h-2.5" />{postPreview.comments.toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Token details */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <SectionLabel n={2} text="Token Details" />
                        </div>
                        <TerminalInput
                          value={tokenName}
                          onChange={(v) => setTokenName(v.slice(0, 32))}
                          placeholder="Token name"
                          mono={false}
                        />
                        <TerminalInput
                          value={tokenSymbol}
                          onChange={(v) => setTokenSymbol(v.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                          placeholder="SYMBOL"
                          mono
                        />
                        <textarea
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="Why should people trade this token?"
                          rows={2}
                          className="w-full bg-black/60 border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder:text-white/15 focus:outline-none focus:border-[#E8431C]/30 focus:shadow-[0_0_0_1px_rgba(232,67,28,0.1)] transition-all resize-none font-mono text-xs"
                        />
                        <button
                          onClick={handleGetQuote}
                          disabled={!tokenName || !tokenSymbol || isBusy}
                          className="w-full py-2 rounded-lg border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 text-white/40 hover:text-white/70 text-[10px] font-mono uppercase tracking-widest transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                        >
                          {step === "quoting" ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                          {step === "quoting" ? "Fetching quote…" : "Get Launch Quote"}
                        </button>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="space-y-5">
                      {/* Fee model */}
                      <div>
                        <SectionLabel n={3} text="Fee Model" />
                        <div className="bg-black/60 border border-white/[0.05] rounded-xl p-3.5 mt-2 space-y-1.5 font-mono text-[10px]">
                          {quote?.launchCost?.requiredSol != null && (
                            <div className="flex justify-between text-white/60 border-b border-white/[0.05] pb-1.5 mb-1.5">
                              <span>launch cost</span>
                              <span className="text-[#E8431C]">~{Math.ceil(quote.launchCost.requiredSol * 1000) / 1000} SOL</span>
                            </div>
                          )}
                          <FeeRow label="total trading fee" value="2.50%" />
                          <FeeRow label="  orynth + meteora" value="1.16%" dim />
                          <FeeRow label="  partner (redcircle)" value="1.34%" highlight="orange" />
                          <FeeRow label="    creator payout" value="0.67%" dim />
                          <FeeRow label="    platform" value="0.67%" dim />
                          <p className="text-white/20 pt-1.5 border-t border-white/[0.05] leading-relaxed">
                            you pay launch costs · trading fees go to creator
                          </p>
                        </div>
                      </div>

                      {/* Wallet */}
                      <div>
                        <SectionLabel n={4} text="Payer Wallet" />
                        <div className="mt-2 flex flex-col gap-2">
                          <WalletMultiButton className="!rounded-lg !h-10 !text-sm !w-full !justify-center !font-mono" />
                          {connected && publicKey && (
                            <p className="text-[10px] text-[#00FFD1]/40 font-mono text-center break-all px-1">
                              {publicKey.toBase58()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Launch button */}
                  <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      onClick={reset}
                      disabled={isBusy}
                      className="px-5 py-2.5 rounded-lg border border-white/[0.06] bg-transparent hover:bg-white/[0.03] text-white/30 hover:text-white/60 text-sm font-mono transition-all disabled:opacity-30"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleLaunch}
                      disabled={isBusy || !connected || !tokenName || !tokenSymbol || !user}
                      className={cn(
                        "px-8 py-2.5 rounded-lg font-mono font-bold text-sm transition-all flex items-center justify-center gap-2",
                        "bg-[#E8431C] hover:bg-[#FF5535] text-black",
                        "disabled:opacity-40 disabled:cursor-not-allowed",
                        "shadow-[0_0_20px_rgba(232,67,28,0.3)] hover:shadow-[0_0_30px_rgba(232,67,28,0.5)]",
                      )}
                    >
                      {isBusy ? (
                        <><Loader2 className="w-4 h-4 animate-spin" />{STEP_STATUS[step].replace("> ", "").replace("_", "")}</>
                      ) : (
                        <><Rocket className="w-4 h-4" /> Launch Token</>
                      )}
                    </button>
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

function TerminalHeader() {
  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-white/[0.05] bg-black/60">
      <div className="flex gap-1.5">
        <div className="w-3 h-3 rounded-full bg-red-500/50" />
        <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
        <div className="w-3 h-3 rounded-full bg-[#00FFD1]/50" />
      </div>
      <span className="flex-1 text-center text-[10px] font-mono text-white/20 tracking-[0.3em] uppercase">
        Mint Terminal
      </span>
      <div className="w-12" />
    </div>
  );
}

function SectionLabel({ n, text }: { n: number; text: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-5 h-5 rounded-md bg-[#E8431C]/10 border border-[#E8431C]/20 flex items-center justify-center text-[9px] font-mono font-bold text-[#E8431C]">{n}</span>
      <span className="text-[10px] font-mono uppercase tracking-widest text-white/30">{text}</span>
    </div>
  );
}

function TerminalInput({ value, onChange, placeholder, mono, disabled }: {
  value: string; onChange: (v: string) => void; placeholder: string; mono?: boolean; disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={cn(
        "w-full bg-black/60 border border-white/[0.07] rounded-lg px-3 py-2.5 text-white/80 text-sm placeholder:text-white/15 focus:outline-none focus:border-[#E8431C]/30 focus:shadow-[0_0_0_1px_rgba(232,67,28,0.1)] transition-all disabled:opacity-50 disabled:cursor-wait",
        mono && "font-mono",
      )}
    />
  );
}

function FeeRow({ label, value, dim, highlight }: {
  label: string; value: string; dim?: boolean; highlight?: "orange";
}) {
  return (
    <div className="flex justify-between">
      <span className={dim ? "text-white/20" : "text-white/40"}>{label}</span>
      <span className={highlight === "orange" ? "text-[#E8431C]/80" : dim ? "text-white/20" : "text-white/50"}>{value}</span>
    </div>
  );
}
