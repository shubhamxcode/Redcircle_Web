import { useMemo, useState, useEffect } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { ArrowUp, MessageSquare, TrendingUp, ExternalLink, BarChart2, Copy, Check, TrendingDown } from "lucide-react";

export type FeedPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  createdAt: string;
  imageUrl?: string;
  flair?: string;
  tokenPrice?: number;
  marketCap?: number;
  volume24h?: number;
  isTrending?: boolean;
  tokenSymbol?: string;
  initialPrice?: string;
  status?: string;
  tokenMintAddress?: string;
  redditUrl?: string;
  totalSupply?: number;
  holders?: number;
};

type FeedCardProps = {
  post: FeedPost;
  className?: string;
  onTrade?: (post: FeedPost) => void;
  index?: number;
};

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(2)}K`;
  return `$${value.toFixed(2)}`;
}

export default function FeedCard({ post, className, index = 0 }: FeedCardProps) {
  const [liveMcap, setLiveMcap] = useState<string | null>(null);
  const [h24Change, setH24Change] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  const timeAgo = useMemo(() => {
    const diffMs = Date.now() - new Date(post.createdAt).getTime();
    const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    return `${Math.floor(diffHr / 24)}d`;
  }, [post.createdAt]);

  // Fetch live MCap from DexScreener via our proxy
  useEffect(() => {
    if (!post.tokenMintAddress) return;
    let cancelled = false;

    const fetchMcap = async () => {
      try {
        const { getApiUrl } = await import("@/lib/auth");
        const res = await fetch(`${getApiUrl()}/api/tokens/${post.tokenMintAddress}/price`);
        const data = await res.json() as { pair?: { fdv?: number; marketCap?: number } };
        if (cancelled) return;
        const value = data.pair?.fdv ?? data.pair?.marketCap;
        if (value && value > 0) setLiveMcap(formatUsd(value));
        const ch = (data.pair as any)?.priceChange?.h24;
        if (ch != null) setH24Change(ch);
      } catch {
        // silently fail — card still renders without MCap
      }
    };

    fetchMcap();
    return () => { cancelled = true; };
  }, [post.tokenMintAddress]);

  const mcapDisplay = liveMcap ?? "—";
  const hasMcap = mcapDisplay !== "—";
  const initial = (post.subreddit ?? "R").slice(0, 1).toUpperCase();
  const isNew = Date.now() - new Date(post.createdAt).getTime() < 24 * 60 * 60 * 1000;

  return (
    <Link to="/token/$tokenId" params={{ tokenId: post.tokenSymbol?.toLowerCase() ?? post.tokenMintAddress ?? post.id }}>
      <motion.article
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut", delay: Math.min(index, 8) * 0.055 }}
        className={cn(
          "group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0c0c0c] cursor-pointer h-full transition-all duration-300",
          "hover:border-[#E8431C]/25 hover:shadow-[0_0_0_1px_rgba(232,67,28,0.1),0_20px_60px_-12px_rgba(232,67,28,0.12),0_0_0_0_transparent]",
          "hover:-translate-y-0.5",
          className,
        )}
      >
        {/* Top-edge accent line — only visible on hover */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#E8431C]/0 to-transparent group-hover:via-[#E8431C]/40 transition-all duration-500 z-10" />

        {/* ── Image header — full-width, edge-to-edge ── */}
        <div className="relative overflow-hidden bg-neutral-900" style={{ height: "12rem" }}>
          {post.imageUrl ? (
            <>
              {/* Blurred ambient background so letterboxed images don't show hard black bars */}
              <div
                className="absolute inset-0 scale-110 blur-xl opacity-40"
                style={{ backgroundImage: `url(${post.imageUrl})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
              <img
                src={post.imageUrl}
                alt="Post media"
                className="relative h-full w-full object-contain transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            </>
          ) : (
            <div className="h-full w-full flex items-center justify-center bg-gradient-to-br from-neutral-800/70 via-neutral-850 to-neutral-900/90">
              <span className="text-7xl font-black text-white/[0.03] select-none">{initial}</span>
            </div>
          )}

          {/* Gradient overlay for readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f0f] via-transparent to-transparent pointer-events-none" />

          {/* Subreddit + time — bottom-left */}
          <div className="absolute bottom-2.5 left-3 flex items-center gap-1.5">
            <span className="flex items-center justify-center w-4 h-4 rounded-full bg-[#E8431C]/20 text-[#E8431C] text-[7px] font-black flex-shrink-0">r/</span>
            <span className="text-[11px] font-medium text-white/60 drop-shadow-sm">{post.subreddit}</span>
            <span className="text-white/25 text-[10px]">·</span>
            <span className="text-[10px] text-white/35 drop-shadow-sm">{timeAgo}</span>
          </div>

          {/* Badges — top-right */}
          <div className="absolute top-2.5 right-2.5 flex flex-col items-end gap-1.5">
            {post.tokenSymbol && (
              <span className="text-[10px] font-bold text-white/80 bg-black/60 backdrop-blur-md border border-white/15 rounded-md px-2 py-0.5 tracking-wide">
                ${post.tokenSymbol}
              </span>
            )}
            {h24Change != null && (
              <span className={cn(
                "inline-flex items-center gap-0.5 rounded-md backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold font-mono border",
                h24Change >= 0
                  ? "bg-[#00FFD1]/10 border-[#00FFD1]/25 text-[#00FFD1]"
                  : "bg-red-500/15 border-red-500/25 text-red-400",
              )}>
                {h24Change >= 0 ? <TrendingUp className="h-2 w-2" /> : <TrendingDown className="h-2 w-2" />}
                {h24Change >= 0 ? "+" : ""}{h24Change.toFixed(1)}%
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center rounded-md bg-violet-500/15 border border-violet-500/30 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-bold text-violet-400 shadow-[0_0_8px_rgba(139,92,246,0.25)] tracking-wider">
                NEW
              </span>
            )}
            {post.isTrending && !isNew && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-[#E8431C]/20 border border-[#E8431C]/35 backdrop-blur-md px-1.5 py-0.5 text-[9px] font-semibold text-[#E8431C] shadow-[0_0_8px_rgba(232,67,28,0.3)]">
                <TrendingUp className="h-2 w-2" /> Hot
              </span>
            )}
          </div>
        </div>

        {/* ── Content ── */}
        <div className="flex flex-col flex-1 px-4 pt-3.5 pb-4">
          {/* Title */}
          <h3 className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-white/80 group-hover:text-white/95 transition-colors flex-1">
            {post.title}
          </h3>

          {/* MCap + Reddit row */}
          <div className="flex items-center justify-between mt-3.5 mb-2.5">
            <div className="flex items-center gap-2">
              <BarChart2 className="h-3 w-3 text-white/20" />
              <span className="text-[10px] font-medium text-white/25 uppercase tracking-wider">MCap</span>
              <span
                className={cn(
                  "text-sm font-bold tabular-nums leading-none",
                  hasMcap ? "text-white/90" : "text-white/20",
                )}
              >
                {mcapDisplay}
              </span>
            </div>

            {post.redditUrl && (
              <a
                href={post.redditUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#E8431C]/8 hover:bg-[#E8431C]/15 border border-[#E8431C]/15 hover:border-[#E8431C]/30 text-[#E8431C]/70 hover:text-[#E8431C] text-[10px] font-medium transition-all"
              >
                <ExternalLink className="h-2.5 w-2.5" />
                Reddit
              </a>
            )}
          </div>

          {/* CA row */}
          {post.tokenMintAddress && (
            <div
              className="flex items-center gap-2 mb-2.5 px-2.5 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-colors cursor-pointer"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigator.clipboard.writeText(post.tokenMintAddress!);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy contract address"
            >
              <span className="text-[9px] font-bold text-white/30 uppercase tracking-wider shrink-0">CA</span>
              <span className="text-[10px] font-mono text-white/40 truncate flex-1">
                {post.tokenMintAddress.slice(0, 8)}…{post.tokenMintAddress.slice(-6)}
              </span>
              {copied
                ? <Check className="h-3 w-3 text-green-400 shrink-0" />
                : <Copy className="h-3 w-3 text-white/25 shrink-0" />
              }
            </div>
          )}

          {/* Stats row */}
          <div className="flex items-center gap-3 pt-2.5 border-t border-white/[0.05] text-[10px] text-white/25 font-medium">
            <span className="flex items-center gap-1">
              <ArrowUp className="h-2.5 w-2.5" />
              {Intl.NumberFormat("en-US", { notation: "compact" }).format(post.upvotes)}
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare className="h-2.5 w-2.5" />
              {Intl.NumberFormat("en-US", { notation: "compact" }).format(post.comments)}
            </span>
            {post.author && (
              <span className="ml-auto text-white/15 truncate max-w-[90px]">u/{post.author}</span>
            )}
          </div>
        </div>
      </motion.article>
    </Link>
  );
}
