import { cn } from "@/lib/utils";
import type { RecentTradeItem } from "@/types/market";

type RecentTradesListProps = {
  trades: RecentTradeItem[];
  className?: string;
};

function formatTimeAgo(isoDate: string) {
  const now = Date.now();
  const ts = new Date(isoDate).getTime();
  const deltaSec = Math.max(0, Math.floor((now - ts) / 1000));

  if (deltaSec < 60) return `${deltaSec}s ago`;
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function RecentTradesList({ trades, className }: RecentTradesListProps) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/60 p-5 backdrop-blur-xl", className)}>
      <h3 className="mb-4 text-lg font-semibold text-white">Recent Trades</h3>

      {trades.length === 0 ? (
        <p className="text-sm text-white/60">No trades yet.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[90px_1fr_70px_90px] px-2 text-[11px] uppercase tracking-wide text-white/45">
            <span>Time</span>
            <span>By</span>
            <span className="text-right">Type</span>
            <span className="text-right">Value</span>
          </div>
          {trades.slice(0, 12).map((trade) => (
            <div
              key={trade.id}
              className="grid grid-cols-[90px_1fr_70px_90px] items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs"
            >
              <span className="text-white/60">{formatTimeAgo(trade.createdAt)}</span>
              <span className="truncate text-white/80">{trade.user.username}</span>
              <span className={cn("text-right font-semibold uppercase", trade.type === "buy" ? "text-green-400" : "text-red-400")}>
                {trade.type}
              </span>
              <span className="text-right font-medium text-white">{trade.totalValue.toFixed(3)} SOL</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
