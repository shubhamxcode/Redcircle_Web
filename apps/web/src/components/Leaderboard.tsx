import { motion } from "motion/react";
import { useState, useEffect } from "react";
import { getApiUrl } from "@/lib/auth";

type Entry = {
  rank: number;
  id: string;
  user: string;
  avatar?: string;
  pnl: number;           // creator USDC earnings
  curatorEarned: number; // curator USDC earnings (0 for old posts)
  volume: number;        // total trading volume in USDC
};

export default function Leaderboard() {
  const [data, setData] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        setLoading(true);
        setError(null);

        const apiUrl = getApiUrl();
        const response = await fetch(`${apiUrl}/api/leaderboard?category=author&limit=10`);
        const result = await response.json();

        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error || "Failed to load leaderboard");
        }
      } catch (err) {
        console.error("❌ Error fetching leaderboard:", err);
        setError("Failed to load leaderboard");
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, []);

  return (
    <section className="w-full">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between px-2">
        <motion.h2
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4 }}
          className="text-lg font-semibold text-white sm:text-xl"
        >
          Leaderboard
        </motion.h2>
        <span className="rounded-lg border border-white/20 bg-white/15 px-3 py-1 text-sm text-white">
          Creator
        </span>
      </div>

      <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border border-white/10">
        {/* Header */}
        <div className="grid grid-cols-12 bg-white/[0.04] px-4 py-2 text-xs text-white/60">
          <div className="col-span-5">Creator</div>
          <div className="col-span-2 text-right">Creator</div>
          <div className="col-span-2 text-right hidden sm:block">Curator</div>
          <div className="col-span-3 text-right">Volume</div>
        </div>
        {/* Sub-header units */}
        <div className="grid grid-cols-12 bg-white/[0.02] px-4 py-1 text-[10px] text-white/30">
          <div className="col-span-5" />
          <div className="col-span-2 text-right">USDC</div>
          <div className="col-span-2 text-right hidden sm:block">USDC</div>
          <div className="col-span-3 text-right">USDC</div>
        </div>

        {loading ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-white/20 border-t-white"></div>
            <p className="mt-3 text-sm text-white/60">Loading leaderboard...</p>
          </div>
        ) : error ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <p className="text-sm text-red-400">⚠️ {error}</p>
          </div>
        ) : data.length === 0 ? (
          <div className="bg-black/60 px-4 py-12 text-center backdrop-blur">
            <p className="text-sm text-white/60">No data available yet</p>
            <p className="mt-1 text-xs text-white/40">No tokenized posts yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-white/10">
            {data.map((e) => (
              <li key={e.id} className="grid grid-cols-12 items-center bg-black/60 px-4 py-3 backdrop-blur">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <span className="w-5 shrink-0 text-white/40 text-sm">{e.rank}</span>
                  {e.avatar ? (
                    <img src={e.avatar} alt={e.user} className="w-7 h-7 rounded-full object-cover shrink-0 border border-white/10" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-white/10 shrink-0 flex items-center justify-center text-[10px] text-white/40 font-bold">
                      {e.user[0]?.toUpperCase()}
                    </div>
                  )}
                  <span className="truncate text-white/90 text-sm">u/{e.user}</span>
                </div>
                <div className="col-span-2 text-right font-medium text-emerald-400 text-sm">
                  ${e.pnl.toFixed(2)}
                </div>
                <div className="col-span-2 text-right hidden sm:block text-sm">
                  {e.curatorEarned > 0
                    ? <span className="text-violet-400">${e.curatorEarned.toFixed(2)}</span>
                    : <span className="text-white/20">—</span>
                  }
                </div>
                <div className="col-span-3 text-right text-white/70 text-sm">${e.volume.toFixed(2)}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
