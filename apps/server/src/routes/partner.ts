import { Router } from "express";
import type { Request, Response } from "express";
import { eq, desc, and } from "drizzle-orm";
import { db } from "../db";
import { posts } from "../db";
import { getPoolCreatorPublicKey } from "../services/orynth.service";

const router = Router();

const TAG = "[Partner API]";

// Request logger — logs every incoming partner request with IP, method, path, query
router.use((req: Request, _res: Response, next) => {
  const ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown";
  const qs = Object.keys(req.query).length ? ` query=${JSON.stringify(req.query)}` : "";
  console.log(`${TAG} ${req.method} ${req.path}${qs} — ip=${ip}`);
  next();
});

// ─── GET /api/v1/tokens ────────────────────────────────────────────────────────

router.get("/tokens", async (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown";

  const limitRaw  = String(req.query.limit  ?? "50");
  const offsetRaw = String(req.query.offset ?? "0");
  const sort      = String(req.query.sort   ?? "newest");

  const limit  = Math.min(parseInt(limitRaw,  10), 100);
  const offset = Math.max(parseInt(offsetRaw, 10), 0);

  if (isNaN(limit) || isNaN(offset)) {
    console.warn(`${TAG} GET /tokens — invalid params limit=${limitRaw} offset=${offsetRaw} ip=${ip}`);
    return res.status(400).json({ success: false, error: "limit and offset must be valid numbers" });
  }

  const validSorts = ["newest", "volume", "marketcap"];
  if (!validSorts.includes(sort)) {
    console.warn(`${TAG} GET /tokens — invalid sort="${sort}" ip=${ip}`);
    return res.status(400).json({ success: false, error: `sort must be one of: ${validSorts.join(", ")}` });
  }

  console.log(`${TAG} GET /tokens — limit=${limit} offset=${offset} sort=${sort} ip=${ip}`);

  try {
    const sortCol = sort === "volume"    ? desc(posts.totalVolume)
                  : sort === "marketcap" ? desc(posts.marketCap)
                  : desc(posts.tokenizedAt);

    const rows = await db
      .select({
        mintAddress:  posts.tokenMintAddress,
        symbol:       posts.tokenSymbol,
        name:         posts.title,
        description:  posts.description,
        thumbnail:    posts.thumbnail,
        sourceUrl:    posts.redditUrl,
        subreddit:    posts.subreddit,
        currentPrice: posts.currentPrice,
        marketCap:    posts.marketCap,
        totalVolume:  posts.totalVolume,
        holders:      posts.holders,
        tokenSlug:    posts.tokenSlug,
        tokenizedAt:  posts.tokenizedAt,
        mintedAt:     posts.mintedAt,
      })
      .from(posts)
      .where(eq(posts.status, "active"))
      .orderBy(sortCol)
      .limit(limit)
      .offset(offset);

    const tokens = rows
      .filter((r) => !!r.mintAddress)
      .map((r) => ({
        mintAddress:  r.mintAddress,
        symbol:       r.symbol,
        name:         r.name,
        description:  r.description,
        thumbnail:    r.thumbnail,
        sourceUrl:    r.sourceUrl,
        subreddit:    r.subreddit,
        redcircleUrl: r.tokenSlug ? `https://redcircle.lol/token/${r.tokenSlug}` : null,
        metrics: {
          currentPrice: r.currentPrice,
          marketCap:    r.marketCap,
          totalVolume:  r.totalVolume,
          holders:      r.holders,
        },
        tokenizedAt: r.tokenizedAt,
        mintedAt:    r.mintedAt,
      }));

    console.log(`${TAG} GET /tokens — returned ${tokens.length} tokens (${rows.length - tokens.length} filtered without mintAddress) ip=${ip}`);

    res.json({
      success: true,
      tokens,
      pagination: { limit, offset, count: tokens.length },
    });
  } catch (err) {
    console.error(`${TAG} GET /tokens — DB error ip=${ip}`, err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, error: "Failed to fetch tokens" });
  }
});

// ─── GET /api/v1/tokens/:mintAddress ──────────────────────────────────────────

router.get("/tokens/:mintAddress", async (req: Request, res: Response) => {
  const ip          = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown";
  const { mintAddress } = req.params;

  if (!mintAddress) {
    console.warn(`${TAG} GET /tokens/:mintAddress — missing mintAddress ip=${ip}`);
    return res.status(400).json({ success: false, error: "mintAddress is required" });
  }

  console.log(`${TAG} GET /tokens/${mintAddress} ip=${ip}`);

  try {
    const rows = await db
      .select()
      .from(posts)
      .where(
        and(
          eq(posts.tokenMintAddress, mintAddress),
          eq(posts.status, "active"),
        )
      )
      .limit(1);

    if (!rows.length) {
      console.warn(`${TAG} GET /tokens/${mintAddress} — not found ip=${ip}`);
      return res.status(404).json({ success: false, error: "Token not found" });
    }

    const r = rows[0]!;
    console.log(`${TAG} GET /tokens/${mintAddress} — found symbol=${r.tokenSymbol} ip=${ip}`);

    res.json({
      success: true,
      token: {
        mintAddress:  r.tokenMintAddress,
        symbol:       r.tokenSymbol,
        name:         r.title,
        description:  r.description,
        thumbnail:    r.thumbnail,
        sourceUrl:    r.redditUrl,
        subreddit:    r.subreddit,
        author:       r.author,
        redcircleUrl: r.tokenSlug ? `https://redcircle.lol/token/${r.tokenSlug}` : null,
        metrics: {
          currentPrice: r.currentPrice,
          marketCap:    r.marketCap,
          totalVolume:  r.totalVolume,
          holders:      r.holders,
        },
        tokenizedAt: r.tokenizedAt,
        mintedAt:    r.mintedAt,
      },
    });
  } catch (err) {
    console.error(`${TAG} GET /tokens/${mintAddress} — DB error ip=${ip}`, err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, error: "Failed to fetch token" });
  }
});

// ─── GET /api/v1/info ─────────────────────────────────────────────────────────

router.get("/info", (req: Request, res: Response) => {
  const ip = req.headers["x-forwarded-for"] ?? req.socket.remoteAddress ?? "unknown";
  console.log(`${TAG} GET /info ip=${ip}`);

  try {
    const deployerWallet = getPoolCreatorPublicKey();
    res.json({
      success: true,
      platform: {
        name:           "RedCircle",
        description:    "Tokenize viral Reddit posts as tradeable SPL tokens on Solana",
        website:        "https://redcircle.lol",
        deployerWallet,
        chain:          "solana",
        tokenSuffix:    "red",
      },
    });
  } catch (err) {
    console.error(`${TAG} GET /info — failed to get deployer wallet ip=${ip}`, err instanceof Error ? err.message : err);
    res.status(500).json({ success: false, error: "Failed to fetch platform info" });
  }
});

export default router;
