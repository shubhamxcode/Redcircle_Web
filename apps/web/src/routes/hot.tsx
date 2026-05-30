import { createFileRoute } from "@tanstack/react-router";
import {
  Flame,
  ArrowUp,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useHotPosts } from "@/hooks/useHotPosts";

export const Route = createFileRoute("/hot")({
  component: HotPage,
});

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

function HotPopup({ onDismiss }: { onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 30);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 400);
    }, 5000);
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [onDismiss]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-none transition-opacity duration-400 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      <div
        className={`w-full max-w-sm rounded-2xl border border-orange-500/30 bg-[#111] shadow-2xl px-6 py-5 transition-all duration-400 ${visible ? "scale-100" : "scale-95"}`}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <Flame className="w-5 h-5 text-orange-400 flex-shrink-0" />
          <p className="text-sm font-semibold text-white">Hot &amp; Trending Posts</p>
        </div>
        <p className="text-sm text-white/60 leading-relaxed">
          These are today's hottest posts from Reddit — content already going viral with massive engagement. Use them to launch a token on Redcircle for the highest chance of explosive growth.
        </p>
      </div>
    </div>
  );
}

function HotPage() {
  const { posts, loading, error, cachedAt, refresh } = useHotPosts();
  const [showModal, setShowModal] = useState(true);

  return (
    <div className="min-h-screen">
      {showModal && <HotPopup onDismiss={() => setShowModal(false)} />}

      <div className="mx-auto max-w-2xl px-4 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <Flame className="w-6 h-6 text-orange-400" />
            <h1 className="text-2xl font-bold text-white tracking-tight">Hot on Reddit</h1>
          </div>
          <div className="flex items-center gap-3">
            {cachedAt !== null && (
              <span className="text-sm text-white/40">Updated {timeAgo(cachedAt)}</span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              title="Refresh"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Post list card */}
        <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">

          {/* Loading state (first load only) */}
          {loading && posts.length === 0 && (
            <div className="flex items-center justify-center gap-2.5 py-24 text-white/40 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading trending posts…
            </div>
          )}

          {/* Error state */}
          {error && (
            <div className="py-16 text-center text-red-400 text-sm px-8">{error}</div>
          )}

          {/* Empty state */}
          {!loading && !error && posts.length === 0 && (
            <div className="py-16 text-center text-white/40 text-sm">
              No trending posts available right now
            </div>
          )}

          {/* Posts */}
          {posts.map((post, i) => (
            <a
              key={post.id}
              href={post.redditUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 px-5 py-4 hover:bg-white/[0.04] transition-colors border-b border-white/6 last:border-0 group"
            >
              {/* Rank */}
              <span className="text-sm text-white/25 font-mono w-5 text-right flex-shrink-0 tabular-nums">
                {i + 1}
              </span>

              {/* Thumbnail */}
              <ThumbnailCell thumbnail={post.thumbnail} subreddit={post.subreddit} />

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/85 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                  {post.title}
                </p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2">
                  <span className="text-sm text-orange-400/90 font-medium">
                    r/{post.subreddit}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-white/40">
                    <ArrowUp className="w-3.5 h-3.5" />
                    {formatCount(post.upvotes)}
                  </span>
                  <span className="flex items-center gap-1 text-sm text-white/40">
                    <MessageSquare className="w-3.5 h-3.5" />
                    {formatCount(post.numComments)}
                  </span>
                </div>
              </div>

              {/* External link */}
              <ExternalLink className="flex-shrink-0 w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors self-center" />
            </a>
          ))}

        </div>
      </div>
    </div>
  );
}

function ThumbnailCell({
  thumbnail,
  subreddit,
}: {
  thumbnail: string | null;
  subreddit: string;
}) {
  if (!thumbnail) {
    return (
      <div className="w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-xs text-white/30 font-bold flex-shrink-0">
        r/
      </div>
    );
  }
  return (
    <img
      src={thumbnail}
      alt={`r/${subreddit}`}
      className="w-16 h-16 rounded-xl object-cover bg-white/5 flex-shrink-0"
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        el.replaceWith(
          Object.assign(document.createElement("div"), {
            className:
              "w-16 h-16 rounded-xl bg-white/5 flex items-center justify-center text-xs text-white/30 font-bold flex-shrink-0",
            textContent: "r/",
          }),
        );
      }}
    />
  );
}
