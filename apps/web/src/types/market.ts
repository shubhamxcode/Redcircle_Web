export type ConnectionStatus = "idle" | "connecting" | "connected" | "reconnecting" | "disconnected";

export type PriceTick = {
  timestamp: string;
  price: number;
  volume: number;
};

export type RecentTradeItem = {
  id: string;
  type: "buy" | "sell";
  amount: number;
  totalValue: number;
  pricePerToken: number;
  createdAt: string;
  user: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };
};

export type TopCuratorItem = {
  rank: number;
  userId: string;
  username: string;
  avatarUrl: string | null;
  amountHeld: number;
  totalBought: number;
  totalSold: number;
  pnlPercent: number;
  pnlValue: number;
};

export type MarketStats = {
  currentPrice: number;
  marketCap: number;
  holders: number;
  volume24h: number;
  priceChangePercent: number;
};

export type MarketSnapshot = {
  marketStats: MarketStats;
  recentTrades: RecentTradeItem[];
  topCurators: TopCuratorItem[];
};

export type MarketEventPayloadMap = {
  connected: { clientId: string; postId: string; connections: number };
  heartbeat: { postId: string; connectedClients: number };
  snapshot: MarketSnapshot;
  trade: RecentTradeItem;
  recent_trades: RecentTradeItem[];
  top_curators: TopCuratorItem[];
  market_stats: MarketStats;
  price_tick: PriceTick;
  error: { message: string; details?: string };
};

export type MarketEventType = keyof MarketEventPayloadMap;

export type MarketStreamEvent<T extends MarketEventType = MarketEventType> = {
  type: T;
  payload: MarketEventPayloadMap[T];
  timestamp: string;
};
