import "dotenv/config";
import http from "node:http";
import cors from "cors";
import express from "express";
import { startPriceSyncJob } from "./jobs/priceSync";
import { initLaunchWebSocket } from "./services/ws.service";
import { startTrendingSyncJob } from "./jobs/trendingSync";
import redditAuthRoutes from "./config/reddit-oauth-simple";
import postsRoutes from "./routes/posts";
import portfolioRoutes from "./routes/portfolio";
import transactionsRoutes from "./routes/transactions";
import leaderboardRoutes from "./routes/leaderboard";
import priceHistoryRoutes from "./routes/price-history";
import waitlistRoutes from "./routes/waitlist";
import launchesRoutes from "./routes/launches";
import adminRoutes from "./routes/admin";
import trendingRoutes from "./routes/trending";
import rewardRoutes from "./routes/reward";
import curatorRewardRoutes from "./routes/curator-reward";
import partnerRoutes from "./routes/partner";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS configuration - Allow all origins for development
app.use(
	cors({
		origin: true, // Allow all origins
		credentials: true,
		methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	}),
);

// Routes
app.use(redditAuthRoutes);
app.use("/api/posts", postsRoutes);
app.use("/api/portfolio", portfolioRoutes);
app.use("/api/transactions", transactionsRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/price-history", priceHistoryRoutes);
app.use("/api/waitlist", waitlistRoutes);
app.use("/api/launches", launchesRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/trending", trendingRoutes);
app.use("/api/reward", rewardRoutes);
app.use("/api/curator-reward", curatorRewardRoutes);
app.use("/api/v1", partnerRoutes);

// ── DexScreener proxy (avoids browser CORS restrictions) ──────────────────────
// Pool address cache — TTL 10 minutes
const poolCache  = new Map<string, { address: string | null; at: number }>();
// Price cache — TTL 30 seconds
const priceCache = new Map<string, { pair: any; at: number }>();

app.get("/api/tokens/:mint/pool", async (req, res) => {
  try {
    const { mint } = req.params;
    const cached = poolCache.get(mint);
    if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
      return res.json({ poolAddress: cached.address });
    }
    const r = await fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`, {
      headers: { "Accept": "application/json" },
    });
    const d = await r.json() as any;
    const poolAddress = d?.data?.[0]?.attributes?.address ?? null;
    poolCache.set(mint, { address: poolAddress, at: Date.now() });
    res.json({ poolAddress });
  } catch {
    res.json({ poolAddress: null });
  }
});

app.get("/api/tokens/:mint/price", async (req, res) => {
  const { mint } = req.params;
  try {

    // Serve from cache if fresh
    const cached = priceCache.get(mint);
    if (cached && Date.now() - cached.at < 30_000) {
      return res.json({ pair: cached.pair });
    }

    const opts = { headers: { "Accept": "application/json" }, signal: AbortSignal.timeout(8000) };

    // Fetch token data + top pool in parallel
    const [tokenRes, poolsRes] = await Promise.all([
      fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}`, opts),
      fetch(`https://api.geckoterminal.com/api/v2/networks/solana/tokens/${mint}/pools?page=1`, opts),
    ]);

    const [tokenData, poolsData] = await Promise.all([
      tokenRes.json() as Promise<any>,
      poolsRes.json() as Promise<any>,
    ]);

    const attrs = tokenData?.data?.attributes;
    if (!attrs) return res.json({ pair: null });

    // Pick highest-liquidity pool for chart embed
    const pools: any[] = poolsData?.data ?? [];
    const topPool = pools[0]?.attributes;

    const pair = {
      priceUsd:    attrs.price_usd ?? "0",
      fdv:         parseFloat(attrs.fdv_usd ?? "0"),
      marketCap:   parseFloat(attrs.market_cap_usd ?? attrs.fdv_usd ?? "0"),
      volume:      { h24: parseFloat(attrs.volume_usd?.h24 ?? "0") },
      priceChange: { h24: topPool?.price_change_percentage?.h24 != null ? parseFloat(topPool.price_change_percentage.h24) : null },
      liquidity:   { usd: parseFloat(attrs.total_reserve_in_usd ?? "0") },
      poolAddress: topPool?.address ?? null,
      pairAddress: topPool?.address ?? null,
    };

    priceCache.set(mint, { pair, at: Date.now() });
    res.json({ pair });
  } catch (err) {
    // Return stale cache if available rather than error
    const stale = priceCache.get(mint);
    if (stale) return res.json({ pair: stale.pair });
    res.json({ pair: null });
  }
});

// ── Image proxy (avoids CORS on Reddit/external images) ───────────────────────
const ALLOWED_IMAGE_HOSTS = new Set([
  "www.redditstatic.com",
  "redditstatic.com",
  "external-preview.redd.it",
  "preview.redd.it",
  "i.redd.it",
  "styles.redditmedia.com",
]);

app.get("/api/image-proxy", async (req, res) => {
  try {
    const { url } = req.query;
    if (!url || typeof url !== "string") return res.status(400).end();

    let parsed: URL;
    try { parsed = new URL(url); } catch { return res.status(400).end(); }

    if (!ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return res.status(403).end();

    const upstream = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!upstream.ok) return res.status(upstream.status).end();

    const contentType = upstream.headers.get("content-type") ?? "image/jpeg";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=86400");

    const buffer = await upstream.arrayBuffer();
    res.send(Buffer.from(buffer));
  } catch {
    res.status(502).end();
  }
});

app.get("/", (_req, res) => {
	res.status(200).json({ message: "RedCircle API is running" });
});

// Health check
app.get("/health", (_req, res) => {
	res.status(200).json({ status: "healthy" });
});

// Global error handler
app.use((err: Error, req: express.Request, res: express.Response, _next: express.NextFunction) => {
	console.error("\n❌ === Global Error Handler ===");
	console.error("Error:", err);
	console.error("Path:", req.path);
	console.error("Method:", req.method);
	console.error("❌ === End of Error ===\n");
	
	res.status(500).json({
		error: "Internal server error",
		message: err.message,
	});
});

	const port = process.env.PORT || 3000;
	const server = http.createServer(app);

	// Attach the launch-broadcast WebSocket to the same HTTP server
	initLaunchWebSocket(server);

	server.listen(Number(port), () => {
	console.log(`\nServer running on port ${port}\n`);
	startPriceSyncJob();
	startTrendingSyncJob();
});
