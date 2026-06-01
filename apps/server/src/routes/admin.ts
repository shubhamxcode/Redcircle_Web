import crypto from "node:crypto";
import express, { type Request, type Response } from "express";
import { eq, desc, notInArray, isNull, or, and } from "drizzle-orm";
import { db } from "../db";
import { launches, claims, posts } from "../db";
import { requireAdmin } from "../middleware/adminAuth";
import * as Orynth from "../services/orynth.service";

const router: express.Router = express.Router();

router.use(requireAdmin);

// ─── GET /api/admin/launches ──────────────────────────────────────────────────
// Returns all launches, newest first.

router.get("/launches", async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(launches).orderBy(desc(launches.createdAt));
    res.json({ success: true, launches: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed" });
  }
});

// ─── POST /api/admin/sync ─────────────────────────────────────────────────────
// Polls Orynth GET /api/v1/launches/{launchId} for every non-final launch.
// Updates status, mintAddress, poolAddress, launchSignature, launchedAt in DB.

function subredditFromUrl(url: string | null): string {
  if (!url) return "reddit";
  const m = url.match(/reddit\.com\/r\/([^/?#]+)/i);
  return m ? m[1] : "reddit";
}

router.post("/sync", async (_req: Request, res: Response) => {
  try {
    // Sync non-final launches + confirmed launches missing their signature
    const pending = await db
      .select()
      .from(launches)
      .where(
        or(
          notInArray(launches.status, ["confirmed", "failed"]),
          and(eq(launches.status, "confirmed"), isNull(launches.launchSignature))
        )
      );

    const withId = pending.filter((l) => !!l.orynthLaunchId);

    const results = await Promise.allSettled(
      withId.map(async (launch) => {
        const remote = await Orynth.getLaunchStatus(launch.orynthLaunchId!);
        const rl = remote.launch;

        const statusMap: Record<Orynth.LaunchStatus, typeof launch.status> = {
          prepared:  "awaiting_payer_signature",
          submitted: "confirming",
          launched:  "confirmed",
          failed:    "failed",
        };
        const newStatus = statusMap[rl.status];

        const updates: Partial<typeof launches.$inferInsert> = {
          status:    newStatus,
          updatedAt: new Date(),
        };
        if (rl.mintAddress)     updates.mintAddress     = rl.mintAddress;
        if (rl.poolAddress)     updates.poolAddress     = rl.poolAddress;
        if (rl.launchSignature) updates.launchSignature = rl.launchSignature;
        if (newStatus === "confirmed" && !launch.launchedAt) updates.launchedAt = new Date();

        await db.update(launches).set(updates).where(eq(launches.id, launch.id));

        // Sync to feed if newly confirmed
        if (newStatus === "confirmed" && launch.mintAddress) {
          try {
            await db.insert(posts).values({
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
              set: { tokenMintAddress: launch.mintAddress, status: "active", updatedAt: new Date() },
            });
          } catch { /* non-critical */ }
        }

        return { id: launch.id, newStatus };
      })
    );

    const synced   = results.filter((r) => r.status === "fulfilled").length;
    const failed   = results.filter((r) => r.status === "rejected").length;
    const errors   = results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .map((r) => r.reason instanceof Error ? r.reason.message : String(r.reason));

    res.json({ success: true, checked: withId.length, synced, failed, errors });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Sync failed" });
  }
});

// ─── GET /api/admin/earnings ──────────────────────────────────────────────────

router.get("/earnings", async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select({ poolAddress: launches.poolAddress })
      .from(launches)
      .where(eq(launches.status, "confirmed"));

    const poolAddresses = rows.map((r) => r.poolAddress).filter((p): p is string => !!p);

    if (!poolAddresses.length) {
      return res.json({ success: true, earnings: [], totalAmountSol: "0" });
    }

    const raw = await Orynth.getEarnings(poolAddresses);
    const earnings = raw.earnings ?? [];

    // Orynth returns USDC amounts; compute total ourselves since totalAmountSol may be stale
    const totalClaimableUsdc = earnings
      .reduce((sum, e) => sum + parseFloat(e.claimableUsdc || "0"), 0)
      .toFixed(6);
    const totalClaimedUsdc = earnings
      .reduce((sum, e) => sum + parseFloat(e.claimedUsdc || "0"), 0)
      .toFixed(6);

    res.json({ success: true, earnings, totalClaimableUsdc, totalClaimedUsdc, poolAddresses });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed" });
  }
});

// ─── POST /api/admin/claims ───────────────────────────────────────────────────

router.post("/claims", async (req: Request, res: Response) => {
  const claimBatchId = crypto.randomUUID();
  let poolAddresses: string[] = req.body?.poolAddresses ?? [];

  try {
    if (!poolAddresses.length) {
      const rows = await db
        .select({ poolAddress: launches.poolAddress })
        .from(launches)
        .where(eq(launches.status, "confirmed"));
      poolAddresses = rows.map((r) => r.poolAddress).filter((p): p is string => !!p);
    }

    if (!poolAddresses.length) {
      return res.status(400).json({ success: false, error: "No pool addresses to claim" });
    }

    // Seed one DB row per pool so we can track status
    await db.insert(claims).values(
      poolAddresses.map((pool) => ({ claimBatchId, poolAddress: pool, status: "preparing" as const }))
    );

    // ── Step 1: prepare ───────────────────────────────────────────────────────
    let prepared: Orynth.ClaimPrepareResponse;
    try {
      prepared = await Orynth.prepareEarningsClaim(poolAddresses);
      console.log("[Admin/claims] prepare response:", JSON.stringify(prepared));
    } catch (err) {
      await db.update(claims)
        .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Prepare failed", updatedAt: new Date() })
        .where(eq(claims.claimBatchId, claimBatchId));
      throw err;
    }

    if (!prepared.transactions?.length) {
      await db.update(claims)
        .set({ status: "failed", errorMessage: "No claimable transactions returned by Orynth", updatedAt: new Date() })
        .where(eq(claims.claimBatchId, claimBatchId));
      return res.status(400).json({ success: false, error: "No claimable transactions", skipped: prepared.skipped });
    }

    const orynthBatchId = prepared.claimBatchId;
    const totalClaimableUsdc = prepared.transactions
      .reduce((sum, t) => sum + parseFloat(t.claimableUsdc || "0"), 0)
      .toFixed(6);

    // Mark skipped pools in DB
    const skippedPools = new Set((prepared.skipped ?? []).map((s) => s.poolAddress));
    const activePools  = new Set(prepared.transactions.map((t) => t.poolAddress));
    for (const pool of skippedPools) {
      await db.update(claims)
        .set({ status: "failed", errorMessage: "No claimable earnings", updatedAt: new Date() })
        .where(and(eq(claims.claimBatchId, claimBatchId), eq(claims.poolAddress, pool)));
    }

    // ── Step 2: sign each transaction ─────────────────────────────────────────
    const signedTransactions: { poolAddress: string; signedTxHex: string }[] = [];
    try {
      for (const tx of prepared.transactions) {
        signedTransactions.push({ poolAddress: tx.poolAddress, signedTxHex: Orynth.signClaimTx(tx.txHex) });
      }
    } catch (err) {
      for (const pool of activePools) {
        await db.update(claims)
          .set({ status: "failed", orynthClaimId: orynthBatchId, errorMessage: err instanceof Error ? err.message : "Sign failed", updatedAt: new Date() })
          .where(and(eq(claims.claimBatchId, claimBatchId), eq(claims.poolAddress, pool)));
      }
      throw err;
    }

    for (const tx of prepared.transactions) {
      await db.update(claims)
        .set({ orynthClaimId: orynthBatchId, amountSol: tx.claimableUsdc, status: "signed", updatedAt: new Date() })
        .where(and(eq(claims.claimBatchId, claimBatchId), eq(claims.poolAddress, tx.poolAddress)));
    }

    // ── Step 3: submit ────────────────────────────────────────────────────────
    let submitted: Orynth.ClaimSubmitResponse;
    try {
      submitted = await Orynth.submitEarningsClaim(orynthBatchId, signedTransactions);
      console.log("[Admin/claims] submit response:", JSON.stringify(submitted));
    } catch (err) {
      for (const pool of activePools) {
        await db.update(claims)
          .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Submit failed", updatedAt: new Date() })
          .where(and(eq(claims.claimBatchId, claimBatchId), eq(claims.poolAddress, pool)));
      }
      throw err;
    }

    // Mark each pool row with its individual result if available
    if (submitted.results?.length) {
      for (const result of submitted.results) {
        await db.update(claims)
          .set({
            status: result.success ? "confirmed" : "failed",
            signature: result.signature ?? null,
            errorMessage: result.success ? null : (result.error ?? null),
            updatedAt: new Date(),
          })
          .where(and(eq(claims.claimBatchId, claimBatchId), eq(claims.poolAddress, result.poolAddress)));
      }
    } else {
      // No per-pool results — mark all active pools as submitted
      for (const pool of activePools) {
        await db.update(claims)
          .set({ status: "submitted", updatedAt: new Date() })
          .where(and(eq(claims.claimBatchId, claimBatchId), eq(claims.poolAddress, pool)));
      }
    }

    res.json({
      success: true,
      claimBatchId,
      orynthBatchId,
      totalClaimableUsdc,
      txCount: signedTransactions.length,
      skippedCount: prepared.skipped?.length ?? 0,
      results: submitted.results ?? [],
    });
  } catch (err) {
    console.error("❌ [Admin/claims] Error:", err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Claim failed",
      details: (err as any)?.orynthDetails ?? null,
    });
  }
});

// ─── GET /api/admin/claims ────────────────────────────────────────────────────

router.get("/claims", async (_req: Request, res: Response) => {
  try {
    const rows = await db.select().from(claims).orderBy(desc(claims.createdAt));
    res.json({ success: true, claims: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Failed" });
  }
});

export default router;
