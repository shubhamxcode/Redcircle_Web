import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Flame,
  ArrowUp,
  MessageSquare,
  ExternalLink,
  RefreshCw,
  Loader2,
  Rocket,
  X,
  CheckCircle2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useHotPosts, type HotPost } from "@/hooks/useHotPosts";

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
    <>
      {/* Mobile: bottom-center sheet */}
      <div
        className={`sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100vw-2rem)] max-w-sm pointer-events-auto transition-all duration-400 ${visible ? "opacity-100 translate-y-0" : "opacity-100 translate-y-4"}`}
      >
        <div className="rounded-2xl border border-orange-500/30 bg-[#111] shadow-2xl px-4 py-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <p className="text-xs font-semibold text-white">Hot &amp; Trending Posts</p>
            </div>
            <button onClick={onDismiss} className="text-white/30 hover:text-white transition-colors cursor-pointer p-1 -mr-1">
              <X className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-white/60 leading-relaxed">
            These are today's hottest posts from Reddit — content already going viral. Use them to launch a token on Redcircle for the highest chance of explosive growth.
          </p>
        </div>
      </div>

      {/* Desktop: top-right toast */}
      <div
        className={`hidden sm:block fixed top-20 right-4 z-50 w-80 pointer-events-none transition-all duration-400 ${visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
      >
        <div className="rounded-2xl border border-orange-500/30 bg-[#111] shadow-2xl px-5 py-4">
          <div className="flex items-center gap-2.5 mb-2.5">
            <Flame className="w-5 h-5 text-orange-400 flex-shrink-0" />
            <p className="text-sm font-semibold text-white">Hot &amp; Trending Posts</p>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            These are today's hottest posts from Reddit — content already going viral. Use them to launch a token on Redcircle for the highest chance of explosive growth.
          </p>
        </div>
      </div>
    </>
  );
}

function LaunchModal({
  post,
  onConfirm,
  onDismiss,
}: {
  post: HotPost;
  onConfirm: () => void;
  onDismiss: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 sm:px-4 pb-4 sm:pb-0">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl px-4 sm:px-6 py-5 sm:py-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        {/* Close */}
        <button
          onClick={onDismiss}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/30 hover:text-white transition-colors p-1 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Flame badge */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 px-2.5 sm:px-3 py-1">
            <Flame className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-orange-400" />
            <span className="text-[11px] sm:text-xs font-semibold text-orange-400">Trending Now</span>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-base sm:text-lg font-bold text-white leading-snug mb-1">
          🚀 Be the first to launch this!
        </h2>
        <p className="text-xs sm:text-sm text-white/45 mb-4 sm:mb-5">
          This post is going viral — claim it before someone else does.
        </p>

        {/* Post preview */}
        <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 sm:px-4 py-3 mb-5 sm:mb-6">
          {post.thumbnail && (
            <img
              src={post.thumbnail}
              alt=""
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
            />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-white/85 line-clamp-2 leading-snug">{post.title}</p>
            <div className="flex items-center gap-2 sm:gap-3 mt-1">
              <span className="text-[11px] sm:text-xs text-orange-400/80">r/{post.subreddit}</span>
              <span className="flex items-center gap-0.5 text-[11px] sm:text-xs text-white/35">
                <ArrowUp className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {formatCount(post.upvotes)}
              </span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-xs sm:text-sm text-white/60 hover:text-white py-2.5 transition-all cursor-pointer"
          >
            Just browse
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm font-semibold text-white py-2.5 transition-all cursor-pointer"
            style={{ background: "linear-gradient(135deg, #E8431C 0%, #FF5535 60%, #FFA500 100%)" }}
          >
            <Rocket className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            Launch it
          </button>
        </div>

        {/* Reddit link */}
        <a
          href={post.redditUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 mt-3 sm:mt-4 text-xs text-white/25 hover:text-white/50 transition-colors py-1 cursor-pointer"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3" />
          View on Reddit
        </a>
      </div>
    </div>
  );
}

function AlreadyLaunchedModal({
  post,
  onDismiss,
}: {
  post: HotPost;
  onDismiss: () => void;
}) {
  const navigate = useNavigate();
  const { tokenInfo } = post;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-3 sm:px-4 pb-4 sm:pb-0">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" onClick={onDismiss} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0e0e0e] shadow-2xl px-4 sm:px-6 py-5 sm:py-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button onClick={onDismiss} className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/30 hover:text-white transition-colors p-1 cursor-pointer">
          <X className="w-4 h-4" />
        </button>

        {/* Badge */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 sm:px-3 py-1">
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-400" />
            <span className="text-[11px] sm:text-xs font-semibold text-emerald-400">Already Launched</span>
          </div>
        </div>

        <h2 className="text-base sm:text-lg font-bold text-white leading-snug mb-1">
          Someone beat you to it! 🏁
        </h2>
        <p className="text-xs sm:text-sm text-white/45 mb-4 sm:mb-5">
          This post is already trading on Redcircle
          {tokenInfo?.tokenSymbol ? ` as $${tokenInfo.tokenSymbol}` : ""}.
          Jump in and trade it.
        </p>

        {/* Post preview */}
        <div className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[0.03] px-3 sm:px-4 py-3 mb-5 sm:mb-6">
          {post.thumbnail && (
            <img src={post.thumbnail} alt="" className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg object-cover flex-shrink-0"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs sm:text-sm font-medium text-white/85 line-clamp-2 leading-snug">{post.title}</p>
            <div className="flex items-center gap-2 sm:gap-3 mt-1">
              <span className="text-[11px] sm:text-xs text-orange-400/80">r/{post.subreddit}</span>
              {tokenInfo?.tokenSymbol && (
                <span className="text-[11px] sm:text-xs text-emerald-400/80 font-medium">${tokenInfo.tokenSymbol}</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3">
          <button onClick={onDismiss}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 hover:bg-white/8 text-xs sm:text-sm text-white/60 hover:text-white py-2.5 transition-all cursor-pointer">
            Maybe later
          </button>
          {tokenInfo?.postId && (
            <button
              onClick={() => navigate({ to: "/token/$tokenId", params: { tokenId: tokenInfo.postId } })}
              className="flex-1 flex items-center justify-center gap-1.5 sm:gap-2 rounded-xl text-xs sm:text-sm font-semibold text-white py-2.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-500"
            >
              <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              View Token
            </button>
          )}
        </div>

        <a href={post.redditUrl} target="_blank" rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 mt-3 sm:mt-4 text-xs text-white/25 hover:text-white/50 transition-colors py-1 cursor-pointer"
          onClick={(e) => e.stopPropagation()}>
          <ExternalLink className="w-3 h-3" />
          View on Reddit
        </a>
      </div>
    </div>
  );
}

function HotPage() {
  const [activeCategory, setActiveCategory] = useState("all");
  const { posts, loading, error, cachedAt, categories, refresh } = useHotPosts(activeCategory);
  const [showToast, setShowToast] = useState(true);
  const [selectedPost, setSelectedPost] = useState<HotPost | null>(null);
  const navigate = useNavigate();

  const handleLaunch = () => {
    if (!selectedPost) return;
    sessionStorage.setItem("hotLaunchUrl", selectedPost.redditUrl);
    navigate({ to: "/home" });
  };

  return (
    <div className="min-h-screen">
      {showToast && <HotPopup onDismiss={() => setShowToast(false)} />}
      {selectedPost && selectedPost.tokenInfo ? (
        <AlreadyLaunchedModal
          post={selectedPost}
          onDismiss={() => setSelectedPost(null)}
        />
      ) : selectedPost ? (
        <LaunchModal
          post={selectedPost}
          onConfirm={handleLaunch}
          onDismiss={() => setSelectedPost(null)}
        />
      ) : null}

      <div className="mx-auto max-w-2xl px-3 sm:px-4 py-6 sm:py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-400" />
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Hot on Reddit</h1>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {cachedAt !== null && (
              <span className="hidden xs:block sm:block text-xs sm:text-sm text-white/40">
                Updated {timeAgo(cachedAt)}
              </span>
            )}
            <button
              onClick={refresh}
              disabled={loading}
              title="Refresh"
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/50 hover:text-white transition-all disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Category filters */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 mb-4 sm:mb-5 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => { setActiveCategory(cat.id); }}
                className={`flex-shrink-0 px-3 sm:px-4 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all cursor-pointer border ${
                  activeCategory === cat.id
                    ? "bg-[#E8431C] border-[#E8431C] text-white"
                    : "border-white/10 text-white/50 hover:text-white hover:border-white/25"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Post list card */}
        <div className="rounded-xl sm:rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">

          {loading && posts.length === 0 && (
            <div className="flex items-center justify-center gap-2.5 py-20 sm:py-24 text-white/40 text-sm">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading trending posts…
            </div>
          )}

          {error && (
            <div className="py-12 sm:py-16 text-center text-red-400 text-sm px-6 sm:px-8">{error}</div>
          )}

          {!loading && !error && posts.length === 0 && (
            <div className="py-12 sm:py-16 text-center text-white/40 text-sm">
              No trending posts available right now
            </div>
          )}

          {posts.map((post, i) => {
            const isTokenized = !!post.tokenInfo;
            return (
              <button
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className={`w-full flex items-center gap-2.5 sm:gap-4 px-3 sm:px-5 py-3 sm:py-4 transition-colors border-b border-white/6 last:border-0 group text-left cursor-pointer ${
                  isTokenized
                    ? "hover:bg-emerald-500/[0.04] active:bg-emerald-500/[0.07]"
                    : "hover:bg-white/[0.04] active:bg-white/[0.06]"
                }`}
              >
                {/* Rank */}
                <span className="text-xs sm:text-sm text-white/25 font-mono w-4 sm:w-5 text-right flex-shrink-0 tabular-nums">
                  {i + 1}
                </span>

                {/* Thumbnail */}
                <ThumbnailCell thumbnail={post.thumbnail} subreddit={post.subreddit} />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-white/85 leading-snug line-clamp-2 group-hover:text-white transition-colors">
                    {post.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-2.5 sm:gap-x-4 gap-y-1 mt-1.5">
                    <span className="text-[11px] sm:text-sm text-orange-400/90 font-medium">
                      r/{post.subreddit}
                    </span>
                    <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-sm text-white/40">
                      <ArrowUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {formatCount(post.upvotes)}
                    </span>
                    <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-sm text-white/40">
                      <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      {formatCount(post.numComments)}
                    </span>
                    {isTokenized && post.tokenInfo?.tokenSymbol && (
                      <span className="flex items-center gap-0.5 sm:gap-1 text-[11px] sm:text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        ${post.tokenInfo.tokenSymbol}
                      </span>
                    )}
                  </div>
                </div>

                {/* Right icon */}
                {isTokenized ? (
                  <CheckCircle2 className="flex-shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-500/50 group-hover:text-emerald-400 transition-colors self-center" />
                ) : (
                  <Rocket className="flex-shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 text-white/15 group-hover:text-orange-400/60 transition-colors self-center" />
                )}
              </button>
            );
          })}

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
  const fallbackClass = "w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl bg-white/5 flex items-center justify-center text-xs text-white/30 font-bold flex-shrink-0";

  if (!thumbnail) {
    return <div className={fallbackClass}>r/</div>;
  }
  return (
    <img
      src={thumbnail}
      alt={`r/${subreddit}`}
      className="w-10 h-10 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl object-cover bg-white/5 flex-shrink-0"
      onError={(e) => {
        const el = e.currentTarget as HTMLImageElement;
        el.replaceWith(
          Object.assign(document.createElement("div"), {
            className: fallbackClass,
            textContent: "r/",
          }),
        );
      }}
    />
  );
}
