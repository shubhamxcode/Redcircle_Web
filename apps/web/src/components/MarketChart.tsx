import { useMemo } from "react";
import { Activity, TrendingDown, TrendingUp } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/utils";
import type { PriceTick } from "@/types/market";

type MarketChartProps = {
  points: PriceTick[];
  currentPrice: number;
  initialPrice: number;
  className?: string;
};

function formatXAxis(timestampIso: string) {
  const date = new Date(timestampIso);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

export default function MarketChart({
  points,
  currentPrice,
  initialPrice,
  className,
}: MarketChartProps) {
  const priceChange = currentPrice - initialPrice;
  const priceChangePercent = initialPrice > 0 ? (priceChange / initialPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const chartData = useMemo(
    () =>
      points.map((point) => ({
        ...point,
        label: formatXAxis(point.timestamp),
      })),
    [points],
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload;
    return (
      <div className="rounded-2xl border border-white/10 bg-black/90 p-3 backdrop-blur-xl">
        <p className="text-xs text-white/60">{new Date(data.timestamp).toLocaleString()}</p>
        <p className="text-sm font-semibold text-white">{Number(data.price).toFixed(6)} SOL</p>
        <p className="text-xs text-white/70">Vol: {Number(data.volume).toFixed(3)} SOL</p>
      </div>
    );
  };

  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl", className)}>
      <div className="mb-5 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">Market Price</h3>
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{currentPrice.toFixed(6)} SOL</span>
            <span className={cn("text-sm font-semibold", isPositive ? "text-green-400" : "text-red-400")}>
              {isPositive ? "+" : ""}
              {priceChangePercent.toFixed(2)}%
            </span>
          </div>
        </div>
        <div className="text-right text-xs text-white/60">
          <div>Live</div>
          <div>{points.length} points</div>
        </div>
      </div>

      {chartData.length === 0 ? (
        <div className="flex h-80 items-center justify-center">
          <div className="flex flex-col items-center gap-2 text-white/60">
            <Activity className="h-7 w-7 animate-pulse" />
            <p className="text-sm">Waiting for trade data...</p>
          </div>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="marketPriceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0.35} />
                <stop offset="95%" stopColor={isPositive ? "#10b981" : "#ef4444"} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.12)" />
            <XAxis dataKey="label" stroke="rgba(255,255,255,0.45)" style={{ fontSize: "11px" }} />
            <YAxis
              dataKey="price"
              stroke="rgba(255,255,255,0.45)"
              style={{ fontSize: "11px" }}
              tickFormatter={(value: number) => value.toFixed(4)}
              domain={["auto", "auto"]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="price"
              stroke={isPositive ? "#10b981" : "#ef4444"}
              strokeWidth={2}
              fill="url(#marketPriceGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
