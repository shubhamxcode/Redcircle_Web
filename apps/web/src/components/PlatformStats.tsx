import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/auth";
import { Rocket, TrendingUp, Layers } from "lucide-react";

interface Stats {
  totalLaunches: number;
  liveOnDex: number;
  trending: number;
  totalMcap: number;
}

function formatMcap(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export default function PlatformStats() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/api/posts?status=active&sortBy=upvotes&limit=100`)
      .then((r) => r.json())
      .then((data) => {
        const posts = data.posts ?? [];
        const liveOnDex = posts.filter((p: any) => p.tokenMintAddress).length;
        const trending = posts.filter((p: any) => p.featured > 0).length;
        const totalMcap = posts.reduce((sum: number, p: any) => {
          return sum + (p.marketCap ? parseFloat(p.marketCap) : 0);
        }, 0);
        setStats({
          totalLaunches: posts.length + (data.hasMore ? 1 : 0),
          liveOnDex,
          trending,
          totalMcap,
        });
      })
      .catch(() => {});
  }, []);

  if (!stats) return null;

  const items = [
    { icon: Rocket, label: "Launches", value: stats.totalLaunches + (stats.totalLaunches >= 100 ? "+" : ""), color: "text-[#E8431C]" },
    { icon: Layers, label: "Live on DEX", value: stats.liveOnDex, color: "text-[#00FFD1]" },
    { icon: TrendingUp, label: "Trending", value: stats.trending, color: "text-emerald-400" },
    { icon: null, label: "Total MCap", value: formatMcap(stats.totalMcap), color: "text-violet-400" },
  ];

  return (
    <div className="flex items-center justify-center gap-0 mb-8 sm:mb-12">
      <div className="inline-flex items-stretch divide-x divide-white/[0.06] rounded-2xl border border-white/[0.07] bg-white/[0.03] backdrop-blur-sm overflow-hidden">
        {items.map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="flex flex-col items-center justify-center px-5 sm:px-8 py-3 sm:py-4 gap-0.5">
            <div className="flex items-center gap-1.5">
              {Icon && <Icon className={`h-3 w-3 ${color} opacity-70`} />}
              <span className={`text-base sm:text-lg font-bold tabular-nums ${color}`}>{value}</span>
            </div>
            <span className="text-[10px] text-white/25 uppercase tracking-widest">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
