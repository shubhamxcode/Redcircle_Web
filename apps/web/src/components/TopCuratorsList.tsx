import { cn } from "@/lib/utils";
import type { TopCuratorItem } from "@/types/market";

type TopCuratorsListProps = {
  curators: TopCuratorItem[];
  className?: string;
};

export default function TopCuratorsList({ curators, className }: TopCuratorsListProps) {
  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/60 p-5 backdrop-blur-xl", className)}>
      <h3 className="mb-4 text-lg font-semibold text-white">Top Curators</h3>

      {curators.length === 0 ? (
        <p className="text-sm text-white/60">No curator positions yet.</p>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-[36px_1fr_100px] px-2 text-[11px] uppercase tracking-wide text-white/45">
            <span>Rank</span>
            <span>User</span>
            <span className="text-right">Amount</span>
          </div>
          {curators.slice(0, 10).map((curator) => (
            <div
              key={curator.userId}
              className="grid grid-cols-[36px_1fr_100px] items-center gap-2 rounded-xl border border-white/8 bg-white/5 px-3 py-2 text-xs"
            >
              <span className="font-semibold text-white/70">{curator.rank}</span>
              <span className="truncate text-white">{curator.username}</span>
              <span className="text-right text-white/80">
                {Intl.NumberFormat("en-US", { notation: "compact" }).format(curator.amountHeld)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
