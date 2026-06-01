import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/auth";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TickerToken {
  symbol: string;
  name: string;
  mintAddress?: string;
  mcap?: number;
  price?: number;
  change?: number; // h24 %
}

function TickerItem({ token }: { token: TickerToken }) {
  const isUp   = (token.change ?? 0) > 0;
  const isDown = (token.change ?? 0) < 0;

  const mcapStr = token.mcap
    ? token.mcap >= 1_000_000
      ? `$${(token.mcap / 1_000_000).toFixed(2)}M`
      : token.mcap >= 1_000
      ? `$${(token.mcap / 1_000).toFixed(1)}K`
      : `$${token.mcap.toFixed(0)}`
    : null;

  return (
    <span className="inline-flex items-center gap-2 px-5 text-xs whitespace-nowrap">
      <span className="text-white/40 font-mono">•</span>
      <span className="text-white/80 font-semibold tracking-wide">${token.symbol}</span>
      {mcapStr && <span className="text-white/35 font-mono">{mcapStr}</span>}
      {token.change != null && (
        <span className={`flex items-center gap-0.5 font-mono font-medium ${isUp ? "text-[#00FFD1]" : isDown ? "text-red-400" : "text-white/30"}`}>
          {isUp ? <TrendingUp size={10} /> : isDown ? <TrendingDown size={10} /> : <Minus size={10} />}
          {Math.abs(token.change).toFixed(2)}%
        </span>
      )}
    </span>
  );
}

export default function TickerBar() {
  const [tokens, setTokens] = useState<TickerToken[]>([]);

  useEffect(() => {
    const apiUrl = getApiUrl();
    fetch(`${apiUrl}/api/posts?status=active&sortBy=upvotes&limit=30`)
      .then((r) => r.json())
      .then(async (data) => {
        const posts: TickerToken[] = (data.posts ?? [])
          .filter((p: any) => p.tokenSymbol)
          .map((p: any) => ({
            symbol:      p.tokenSymbol,
            name:        p.title,
            mintAddress: p.tokenMintAddress,
            mcap:        undefined,
            price:       undefined,
          }));
        setTokens(posts);

        // Enrich top 10 with live DexScreener data
        const top10 = posts.filter((p) => p.mintAddress).slice(0, 10);
        await Promise.allSettled(
          top10.map(async (tok) => {
            try {
              const res = await fetch(`${apiUrl}/api/tokens/${tok.mintAddress}/price`);
              const d   = await res.json() as { pair?: any };
              if (d.pair) {
                tok.change = d.pair.priceChange?.h24 ?? undefined;
                tok.mcap   = d.pair.fdv ?? d.pair.marketCap ?? undefined;
              }
            } catch { /* keep stored data */ }
          })
        );
        setTokens([...posts]);
      })
      .catch(() => {});
  }, []);

  if (!tokens.length) return null;

  // Each item is ~150px wide. To guarantee seamless loop at -50%, one "half"
  // must be wider than the widest viewport (≈1920px). Pad to 20 items minimum.
  const MIN_ITEMS = 20;
  const repeats = Math.ceil(MIN_ITEMS / tokens.length);
  const base = Array.from({ length: repeats }, () => tokens).flat();
  const doubled = [...base, ...base];

  return (
    <div className="fixed top-16 left-0 right-0 z-50 h-8 overflow-hidden border-b border-white/[0.04] bg-black/90 backdrop-blur-md">
      {/* Left fade */}
      <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-r from-black/90 to-transparent" />
      {/* Right fade */}
      <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 z-10 bg-gradient-to-l from-black/90 to-transparent" />

      {/* Flex wrapper just for vertical centering — does NOT constrain width */}
      <div className="flex items-center h-full">
        <div
          className="animate-ticker inline-flex items-center select-none whitespace-nowrap"
          style={{ willChange: "transform" }}
        >
          {doubled.map((tok, i) => (
            <TickerItem key={`${tok.symbol}-${i}`} token={tok} />
          ))}
        </div>
      </div>
    </div>
  );
}
