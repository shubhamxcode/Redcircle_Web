import express, { type Request, type Response } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { launches, posts } from "../db";
import { authenticateToken } from "../middleware/auth";
import * as Orynth from "../services/orynth.service";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: express.Router = express.Router();

type LaunchRow = typeof launches.$inferSelect;
type DbStatus = LaunchRow["status"];

// Map Orynth status → our internal status
function mapOrynthStatus(o: Orynth.LaunchStatus): DbStatus {
  switch (o) {
    case "prepared":  return "awaiting_payer_signature";
    case "submitted": return "confirming";
    case "launched":  return "confirmed";
    case "failed":    return "failed";
  }
}

// ─── Sync confirmed launch → posts table (feed) ──────────────────────────────
// Parses subreddit from a reddit URL like https://www.reddit.com/r/solana/...
function subredditFromUrl(url: string): string {
  const m = url.match(/reddit\.com\/r\/([^/?#]+)/i);
  return m ? m[1] : "reddit";
}

async function syncLaunchToFeed(launch: LaunchRow) {
  if (!launch.mintAddress) return;
  try {
    await db.insert(posts).values({
      ...(launch.postId ? { id: launch.postId } : {}),
      redditPostId:     launch.sourceId,
      redditUrl:        launch.sourceUrl,
      title:            launch.sourceTitle,
      author:           launch.creatorUsername,
      subreddit:        subredditFromUrl(launch.sourceUrl),
      thumbnail:        launch.tokenImageUrl ?? undefined,
      upvotes:          0,
      comments:         0,
      tokenSupply:      1_000_000_000,
      initialPrice:     "0",
      currentPrice:     "0",
      tokenMintAddress: launch.mintAddress,
      tokenSymbol:      launch.tokenSymbol,
      description:      launch.tokenDescription ?? undefined,
      status:           "active",
      creatorId:        launch.launcherId ?? null,
    }).onConflictDoUpdate({
      target: posts.redditPostId,
      set: {
        tokenMintAddress: launch.mintAddress,
        tokenSymbol:      launch.tokenSymbol,
        status:           "active",
        updatedAt:        new Date(),
      },
    });
  } catch (e) {
  }
}

// ─── POST /api/launches/suggest-name ─────────────────────────────────────────
// Use Gemini to generate a creative token name + ticker from Reddit post context.

router.post("/suggest-name", async (req: Request, res: Response) => {
  const { title, subreddit, content } = req.body as {
    title?: string; subreddit?: string; content?: string;
  };

  if (!title) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "GEMINI_API_KEY not configured" });
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `You are a crypto token naming expert. Given a Reddit post, generate a catchy, memorable token name and ticker that captures the essence of the post.

Reddit post:
- Title: ${title}
- Subreddit: r/${subreddit ?? "unknown"}
${content ? `- Content snippet: ${content.slice(0, 300)}` : ""}

Rules:
- NAME: 3–10 characters, can be a word, abbreviation, or creative portmanteau. Memorable and relevant to the post topic.
- SYMBOL: 3–8 uppercase letters/numbers only, no spaces. Short and punchy.
- Do NOT use generic words like "Token", "Coin", "Crypto", "Moon", "Gem".
- Make it feel native to the post's actual topic.

Respond with valid JSON only, no markdown:
{"name": "...", "symbol": "..."}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();

    // Strip markdown code fences if present
    const json = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(json) as { name: string; symbol: string };

    res.json({
      name:   String(parsed.name).slice(0, 32),
      symbol: String(parsed.symbol).toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const isQuota = msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED");
    // Return 200 with null so the frontend falls back to manual input gracefully
    res.json({ name: null, symbol: null, error: isQuota ? "quota" : "unavailable" });
  }
});

// ─── GET /api/launches/quote ──────────────────────────────────────────────────
// Show launch cost + fee split before the user commits.

router.get("/quote", async (_req, res) => {
  try {
    const quote = await Orynth.getQuote();
    res.json({ success: true, quote });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to get quote" });
  }
});

// ─── POST /api/launches/prepare ───────────────────────────────────────────────
// 1. Validate input
// 2. Call Orynth /prepare with externalId (idempotency)
// 3. Sign as poolCreator (partner wallet)
// 4. Persist launch record
// 5. Return partially-signed tx hex for the payer (launcher) to sign

router.post("/prepare", async (req: Request, res: Response) => {
  try {
    const body = z.object({
      // Reddit source data — passed straight through to Orynth
      redditPostId:   z.string().min(1),
      redditUrl:      z.string().url(),
      redditTitle:    z.string().min(1),
      redditAuthor:   z.string().min(1),
      redditThumbnail: z.string().url().optional(),
      // Launch params
      payerWalletAddress: z.string().min(32).max(44),
      tokenName:          z.string().min(1).max(32),
      tokenSymbol:        z.string().min(1).max(10),
      description:        z.string().max(500).optional(),
      imageUrl:           z.string().url().optional(),
    }).parse(req.body);

    // Use wallet address as the launcher identifier — no Redcircle account needed
    const externalId = `redcircle:${body.redditPostId}:${body.payerWalletAddress}`;

    // Idempotency check — only reuse if the tx is already on-chain.
    // awaiting_payer_signature records have an expired blockhash (~90s on Solana), so always re-prepare.
    const [existing] = await db.select().from(launches)
      .where(eq(launches.externalId, externalId))
      .limit(1);

    const ON_CHAIN_STATUSES = new Set<DbStatus>(["submitting", "confirming", "confirmed"]);
    if (existing && ON_CHAIN_STATUSES.has(existing.status) && existing.preparedTxHex) {
      return res.json({
        success: true,
        launchId:             existing.id,
        orynthLaunchId:       existing.orynthLaunchId,
        partiallySignedTxHex: existing.preparedTxHex,
        feeConfig:            existing.feeConfig ? JSON.parse(existing.feeConfig) : null,
      });
    }

    // If a previous attempt failed at the Orynth level, pass a fresh externalId so Orynth
    // creates a new launch instead of returning the stale failed record idempotently.
    const orynthExternalId = existing?.status === "failed"
      ? `${externalId}:${Date.now()}`
      : externalId;

    // Call Orynth /prepare — source has NO `title`, creator has NO `displayName`
    const orynthPayload = {
      externalId: orynthExternalId,
      payerWalletAddress: body.payerWalletAddress,
      source: {
        platform: "reddit",
        url:      body.redditUrl,
        id:       body.redditPostId,
        type:     "post",
      },
      creator: {
        platform:       "reddit",
        username:       body.redditAuthor,
        platformUserId: body.redditAuthor,
        profileUrl:     `https://reddit.com/u/${body.redditAuthor}`,
      },
      name:        body.tokenName,
      symbol:      body.tokenSymbol.toUpperCase(),
      description: (() => {
        const base = body.description?.trim() || body.redditTitle;
        const tokenSlug = body.tokenSymbol.toLowerCase();
        return `${base}\n\n🔴 Redcircle: https://redcircle.lol/token/${tokenSlug}\n📝 Reddit: ${body.redditUrl}`;
      })(),
      imageUrl:    body.imageUrl ?? body.redditThumbnail ?? "https://www.redcircle.lol/logo.png",
    };

    const prepared = await Orynth.prepareLaunch(orynthPayload);

    // prepared.launch is the actual data
    const orynthLaunch = prepared.launch;

    if (!orynthLaunch?.preparedTxHex) {
      return res.status(500).json({ success: false, error: "Orynth did not return a transaction to sign. Please try again." });
    }

    // Partner signs as poolCreator — API key & private key never leave server
    const partiallySignedTxHex = Orynth.signAsPoolCreator(orynthLaunch.preparedTxHex);

    // Upsert launch record
    const [launch] = await db.insert(launches).values({
      externalId,
      orynthLaunchId:        orynthLaunch.id,
      launcherId:            null,
      sourcePlatform:        "reddit",
      sourceId:              body.redditPostId,
      sourceUrl:             body.redditUrl,
      sourceTitle:           body.redditTitle,
      creatorPlatformUserId: body.redditAuthor,
      creatorUsername:       body.redditAuthor,
      payerWalletAddress:    body.payerWalletAddress,
      tokenName:             body.tokenName,
      tokenSymbol:           body.tokenSymbol.toUpperCase(),
      tokenDescription:      body.description,
      tokenImageUrl:         body.imageUrl,
      preparedTxHex:         partiallySignedTxHex,
      feeConfig:             JSON.stringify(orynthLaunch.feeConfig),
      partnerFeeBps:         orynthLaunch.feeConfig.partnerFeeBps,
      creatorFeeBps:         orynthLaunch.feeConfig.suggestedCreatorShareBps,
      platformFeeBps:        orynthLaunch.feeConfig.suggestedPartnerShareBps,
      status:                mapOrynthStatus(orynthLaunch.status),
    })
    .onConflictDoUpdate({
      target: launches.externalId,
      set: {
        orynthLaunchId: orynthLaunch.id,
        preparedTxHex:  partiallySignedTxHex,
        feeConfig:      JSON.stringify(orynthLaunch.feeConfig),
        status:         mapOrynthStatus(orynthLaunch.status),
        errorMessage:   null,
        updatedAt:      new Date(),
      },
    })
    .returning();

    if (!launch) {
      return res.status(500).json({ success: false, error: "Failed to persist launch" });
    }

    res.json({
      success: true,
      launchId:             launch.id,
      orynthLaunchId:       launch.orynthLaunchId,
      partiallySignedTxHex,  // payer signs this on the frontend
      requiredSigners:      orynthLaunch.requiredSigners,
      feeConfig:            orynthLaunch.feeConfig,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to prepare launch" });
  }
});

// ─── POST /api/launches/submit ────────────────────────────────────────────────
// Payer wallet has signed the tx on the frontend.
// We receive the fully-signed tx hex and submit it to Orynth.

router.post("/submit", async (req: Request, res: Response) => {
  let launchId: string | undefined;
  try {
    const body = z.object({
      launchId:     z.string().uuid(),
      signedTxHex:  z.string().min(1),
    }).parse(req.body);
    launchId = body.launchId;

    const [launch] = await db.select().from(launches)
      .where(eq(launches.id, body.launchId))
      .limit(1);

    if (!launch)                 return res.status(404).json({ success: false, error: "Launch not found" });
    if (!launch.orynthLaunchId)  return res.status(400).json({ success: false, error: "Launch not prepared with Orynth" });

    await db.update(launches)
      .set({ signedTxHex: body.signedTxHex, status: "submitting", updatedAt: new Date() })
      .where(eq(launches.id, body.launchId));

    // Orynth validates that signed tx message matches prepared message → fee tampering prevented
    await Orynth.submitLaunch(launch.orynthLaunchId, body.signedTxHex);

    await db.update(launches)
      .set({ status: "confirming", updatedAt: new Date() })
      .where(eq(launches.id, body.launchId));

    res.json({ success: true, launchId: body.launchId, orynthLaunchId: launch.orynthLaunchId });
  } catch (err) {
    if (launchId) {
      try {
        await db.update(launches)
          .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Submit failed", updatedAt: new Date() })
          .where(eq(launches.id, launchId));
      } catch { /* ignore */ }
    }

    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to submit launch" });
  }
});

// ─── GET /api/launches/:launchId/status ───────────────────────────────────────
// Sync status from Orynth. When `launched`, persists mintAddress/poolAddress/signature.

router.get("/:launchId/status", async (req, res) => {
  try {
    const [launch] = await db.select().from(launches)
      .where(eq(launches.id, req.params.launchId))
      .limit(1);

    if (!launch) return res.status(404).json({ success: false, error: "Launch not found" });

    // Poll Orynth if we're still waiting
    if (launch.orynthLaunchId && launch.status !== "confirmed" && launch.status !== "failed") {
      try {
        const remote = await Orynth.getLaunchStatus(launch.orynthLaunchId);
        const newStatus = mapOrynthStatus(remote.launch.status);

        const updates: Partial<typeof launches.$inferInsert> = {
          status:      newStatus,
          updatedAt:   new Date(),
        };
        if (remote.launch.mintAddress) updates.mintAddress = remote.launch.mintAddress;
        if (remote.launch.poolAddress) updates.poolAddress = remote.launch.poolAddress;

        await db.update(launches).set(updates).where(eq(launches.id, launch.id));

        launch.status      = newStatus;
        launch.mintAddress = remote.launch.mintAddress ?? launch.mintAddress;
        launch.poolAddress = remote.launch.poolAddress ?? launch.poolAddress;

        if (newStatus === "confirmed") await syncLaunchToFeed(launch);
      } catch (e) {
      }
    }

    res.json({
      success: true,
      launch: {
        id:             launch.id,
        status:         launch.status,
        mintAddress:    launch.mintAddress,
        poolAddress:    launch.poolAddress,
        tokenName:      launch.tokenName,
        tokenSymbol:    launch.tokenSymbol,
        orynthLaunchId: launch.orynthLaunchId,
        createdAt:      launch.createdAt,
        feeBps: {
          partner:  launch.partnerFeeBps,
          creator:  launch.creatorFeeBps,
          platform: launch.platformFeeBps,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed to get launch status" });
  }
});

// ─── POST /api/launches/webhook ───────────────────────────────────────────────
// Orynth webhook: partner_launch.launched
// Verifies HMAC-SHA256 via x-orynth-signature header before crediting balances.

router.post("/webhook", async (req: Request, res: Response) => {
  try {
    const signature = req.headers["x-orynth-signature"] as string | undefined;
    if (!signature) return res.status(400).json({ error: "Missing signature" });

    const rawBody = JSON.stringify(req.body);
    if (!Orynth.verifyWebhookSignature(rawBody, signature)) {
      return res.status(401).json({ error: "Invalid signature" });
    }

    const { type, launchId: orynthLaunchId, mintAddress, poolAddress, launchSignature } = req.body as {
      type: string;
      launchId: string;
      externalId?: string;
      mintAddress?: string;
      poolAddress?: string;
      launchSignature?: string;
    };

    if (type === "partner_launch.launched" && orynthLaunchId) {
      const now = new Date();
      await db.update(launches)
        .set({
          status:          "confirmed",
          mintAddress:     mintAddress,
          poolAddress:     poolAddress,
          launchSignature: launchSignature ?? null,
          launchedAt:      now,
          submittedAt:     now,
          updatedAt:       now,
        })
        .where(eq(launches.orynthLaunchId, orynthLaunchId));

      // Sync to posts table so it appears in the feed
      const [confirmedLaunch] = await db.select().from(launches)
        .where(eq(launches.orynthLaunchId, orynthLaunchId))
        .limit(1);
      if (confirmedLaunch) await syncLaunchToFeed(confirmedLaunch);
    }

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Webhook processing failed" });
  }
});

export default router;
