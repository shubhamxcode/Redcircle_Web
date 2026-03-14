import { useMemo } from "react";
import type { MarketStats, PriceTick, RecentTradeItem, TopCuratorItem } from "@/types/market";

function hashSeed(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function rng(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

export function useMarketDemoState(postId?: string, basePrice = 0.001) {
  return useMemo(() => {
    const id = postId || "demo-post";
    const seed = hashSeed(id);
    const random = rng(seed);

    const chartPoints: PriceTick[] = [];
    const now = Date.now();
    let rollingPrice = Math.max(basePrice, 0.0001);
    let rollingVolume = 0;

    for (let i = 0; i < 36; i += 1) {
      const drift = (random() - 0.45) * 0.08;
      rollingPrice = Math.max(0.00001, rollingPrice * (1 + drift));
      const volume = Number((random() * 4.5 + 0.15).toFixed(3));
      rollingVolume += volume;

      chartPoints.push({
        timestamp: new Date(now - (35 - i) * 5 * 60 * 1000).toISOString(),
        price: Number(rollingPrice.toFixed(6)),
        volume,
      });
    }

    const recentTrades: RecentTradeItem[] = Array.from({ length: 12 }).map((_, index) => {
      const type = random() > 0.42 ? "buy" : "sell";
      const amount = Math.floor(random() * 2000000) + 50000;
      const totalValue = Number((random() * 5.5 + 0.15).toFixed(3));
      const pricePerToken = Number((totalValue / amount).toFixed(9));

      return {
        id: `${id}-trade-${index}`,
        type,
        amount,
        totalValue,
        pricePerToken,
        createdAt: new Date(now - index * 18 * 60 * 1000).toISOString(),
        user: {
          id: `${id}-user-${index}`,
          username: `trader_${index + 1}`,
          avatarUrl: null,
        },
      };
    });

    const topCurators: TopCuratorItem[] = Array.from({ length: 10 }).map((_, index) => {
      const amountHeld = Math.floor(random() * 90000000) + 5000000;
      const totalBought = Number((random() * 30 + 1).toFixed(3));
      const totalSold = Number((random() * 15).toFixed(3));
      const pnlPercent = Number(((random() - 0.35) * 120).toFixed(2));
      const pnlValue = Number(((totalBought * pnlPercent) / 100).toFixed(3));

      return {
        rank: index + 1,
        userId: `${id}-curator-${index}`,
        username: `curator_${index + 1}`,
        avatarUrl: null,
        amountHeld,
        totalBought,
        totalSold,
        pnlPercent,
        pnlValue,
      };
    });

    const currentPrice = chartPoints[chartPoints.length - 1]?.price ?? basePrice;
    const marketStats: MarketStats = {
      currentPrice,
      marketCap: Number((currentPrice * (12000000 + Math.floor(random() * 5000000))).toFixed(3)),
      holders: 20 + Math.floor(random() * 120),
      volume24h: Number(rollingVolume.toFixed(3)),
      priceChangePercent: Number((((currentPrice - basePrice) / basePrice) * 100).toFixed(2)),
    };

    return {
      marketStats,
      chartPoints,
      recentTrades,
      topCurators,
      connectionStatus: "demo",
    };
  }, [postId, basePrice]);
}
