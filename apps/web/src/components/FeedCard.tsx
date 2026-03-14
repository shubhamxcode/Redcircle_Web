import { useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ArrowUp, MessageSquare, TrendingUp } from "lucide-react";

export type FeedPost = {
  id: string;
  title: string;
  subreddit: string;
  author: string;
  upvotes: number;
  comments: number;
  createdAt: string; // ISO string
  imageUrl?: string;
  flair?: string;
  tokenPrice?: number; // in SOL
  marketCap?: number; // in SOL
  volume24h?: number; // in SOL
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
};

export default function FeedCard({ post, className, onTrade }: FeedCardProps) {
  const timeAgo = useMemo(() => {
    const diffMs = Date.now() - new Date(post.createdAt).getTime();
    const diffMin = Math.max(1, Math.floor(diffMs / (1000 * 60)));
    if (diffMin < 60) return `${diffMin}m`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h`;
    const diffDay = Math.floor(diffHr / 24);
    return `${diffDay}d`;
  }, [post.createdAt]);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/5 bg-neutral-900/50 p-4 transition-all hover:border-white/10 hover:bg-neutral-900/80",
        className,
      )}
    >
      {/* Content Wrapper */}
      <div className="flex-1">
        {/* Header */}
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-white/40">
            <span className="font-medium text-white/60">r/{post.subreddit}</span>
            <span>•</span>
            <span>{timeAgo}</span>
          </div>
          {post.isTrending && (
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/10 px-2 py-0.5 text-[10px] font-medium text-orange-400">
              <TrendingUp className="h-3 w-3" />
              Trending
            </span>
          )}
        </div>

        {/* Title links to market details */}
        <a
          href={`/token/${post.id}`}
          className="group/link block"
        >
          <h3 className="mb-3 line-clamp-2 text-lg font-semibold leading-snug text-white/90 transition-colors group-hover/link:text-white">
            {post.title}
          </h3>
        </a>

        {/* Media links to market details */}
        {post.imageUrl && (
          <a
            href={`/token/${post.id}`}
            className="mb-4 block overflow-hidden rounded-xl bg-neutral-800"
          >
            <motion.img
              src={post.imageUrl}
              alt="Post media"
              className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          </a>
        )}

        {/* Optional source link to original Reddit post */}
        {post.redditUrl && (
          <a
            href={post.redditUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 inline-block text-xs text-white/50 hover:text-white/80"
          >
            View source on Reddit
          </a>
        )}
      </div>

      {/* Footer / Stats */}
      <div className="mt-auto pt-3 border-t border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-4 text-xs text-white/50 font-medium">
          <span className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
            <ArrowUp className="h-3.5 w-3.5" />
            {Intl.NumberFormat('en-US', { notation: "compact" }).format(post.upvotes)}
          </span>
          <span className="flex items-center gap-1.5 hover:text-white/70 transition-colors">
            <MessageSquare className="h-3.5 w-3.5" />
            {Intl.NumberFormat('en-US', { notation: "compact" }).format(post.comments)}
          </span>
        </div>

        <div className="flex items-center gap-3">
          {typeof post.tokenPrice === "number" && (
            <div className="text-right">
              <div className="text-xs font-mono text-white/90">
                {post.tokenPrice.toFixed(4)} SOL
              </div>
            </div>
          )}
          <Link
            to="/token/$tokenId"
            params={{ tokenId: post.id }}
            className="inline-flex h-8 items-center rounded-lg border border-blue-400/30 bg-blue-500/15 px-3 text-xs font-medium text-blue-200 transition-colors hover:bg-blue-500/25"
          >
            Visit Market
          </Link>
          <Button
            size="sm"
            variant="secondary"
            className="h-8 px-4 rounded-lg bg-white/5 text-white hover:bg-white/10 border border-white/5 font-medium text-xs"
            onClick={() => onTrade?.(post)}
          >
            Trade
          </Button>
        </div>
      </div>
    </motion.article>
  );
}


