import { useEffect, useMemo, useRef, useState } from "react";
import {
  CandlestickSeries,
  ColorType,
  HistogramSeries,
  createChart,
  type UTCTimestamp,
} from "lightweight-charts";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { cn } from "@/lib/utils";
import { getApiUrl } from "@/lib/auth";

type Candle = {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

type Timeframe = "1m" | "5m" | "15m" | "1h" | "1d";

interface PriceChartProps {
  postId: string;
  currentPrice: number;
  initialPrice: number;
  tokenSymbol?: string;
  className?: string;
}

const TIMEFRAMES: Timeframe[] = ["1m", "5m", "15m", "1h", "1d"];

export default function PriceChart({
  postId,
  currentPrice,
  initialPrice,
  tokenSymbol = "TOKEN",
  className,
}: PriceChartProps) {
  const chartRef = useRef<HTMLDivElement | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const [timeframe, setTimeframe] = useState<Timeframe>("5m");
  const [loading, setLoading] = useState(true);

  const priceChange = currentPrice - initialPrice;
  const priceChangePercent =
    initialPrice > 0 ? ((priceChange / initialPrice) * 100).toFixed(2) : "0.00";
  const isPositive = priceChange >= 0;

  useEffect(() => {
    const fetchCandles = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `${getApiUrl()}/api/trading/candles/${postId}?timeframe=${timeframe}`,
          { credentials: "include" }
        );
        const result = await response.json();
        setCandles(result.success ? result.candles || [] : []);
      } catch (error) {
        console.error("Error fetching RedCircle candles:", error);
        setCandles([]);
      } finally {
        setLoading(false);
      }
    };

    void fetchCandles();
  }, [postId, timeframe]);

  const chartData = useMemo(
    () =>
      candles.map((candle) => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as UTCTimestamp,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      })),
    [candles]
  );

  const volumeData = useMemo(
    () =>
      candles.map((candle) => ({
        time: Math.floor(new Date(candle.timestamp).getTime() / 1000) as UTCTimestamp,
        value: candle.volume,
        color: candle.close >= candle.open ? "rgba(34,197,94,0.35)" : "rgba(248,113,113,0.35)",
      })),
    [candles]
  );

  useEffect(() => {
    if (!chartRef.current || chartData.length === 0) return;

    const chart = createChart(chartRef.current, {
      height: 360,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255,255,255,0.62)",
      },
      grid: {
        vertLines: { color: "rgba(255,255,255,0.06)" },
        horzLines: { color: "rgba(255,255,255,0.06)" },
      },
      rightPriceScale: {
        borderColor: "rgba(255,255,255,0.12)",
      },
      timeScale: {
        borderColor: "rgba(255,255,255,0.12)",
        timeVisible: true,
      },
      crosshair: {
        horzLine: { color: "rgba(255,255,255,0.2)" },
        vertLine: { color: "rgba(255,255,255,0.2)" },
      },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#f87171",
      borderVisible: false,
      wickUpColor: "#22c55e",
      wickDownColor: "#f87171",
    });
    candleSeries.setData(chartData);

    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
    });
    volumeSeries.priceScale().applyOptions({
      scaleMargins: {
        top: 0.8,
        bottom: 0,
      },
    });
    volumeSeries.setData(volumeData);

    chart.timeScale().fitContent();

    const resizeObserver = new ResizeObserver(([entry]) => {
      if (!entry) return;
      chart.applyOptions({ width: entry.contentRect.width });
    });
    resizeObserver.observe(chartRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, [chartData, volumeData]);

  return (
    <div className={cn("rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur-xl", className)}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">{tokenSymbol} Price</h3>
            {isPositive ? (
              <TrendingUp className="h-5 w-5 text-green-400" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400" />
            )}
          </div>
          <div className="mt-1 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-white">
              {currentPrice.toFixed(6)} SOL
            </span>
            <span
              className={cn(
                "text-sm font-semibold",
                isPositive ? "text-green-400" : "text-red-400"
              )}
            >
              {isPositive ? "+" : ""}
              {priceChangePercent}%
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-medium transition-all",
                timeframe === tf
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white"
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <EmptyChart label="Loading chart data..." pulse />
      ) : chartData.length === 0 ? (
        <EmptyChart label="No indexed candles yet" detail="Candles will appear after RedCircle trades are confirmed." />
      ) : (
        <div ref={chartRef} className="h-[360px] w-full" />
      )}
    </div>
  );
}

function EmptyChart({
  label,
  detail,
  pulse = false,
}: {
  label: string;
  detail?: string;
  pulse?: boolean;
}) {
  return (
    <div className="flex h-80 items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <Activity className={cn("h-8 w-8 text-white/40", pulse && "animate-pulse")} />
        <p className="text-sm text-white/60">{label}</p>
        {detail && <p className="text-xs text-white/40">{detail}</p>}
      </div>
    </div>
  );
}
