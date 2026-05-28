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
        if (newStatus === "confirmed" && launch.mintAddress && launch.launcherId) {
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
              creatorId:        launch.launcherId,
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

    const { earnings, totalAmountSol } = await Orynth.getEarnings(poolAddresses);
    res.json({ success: true, earnings, totalAmountSol });
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

    const claimRows = poolAddresses.map((pool) => ({
      claimBatchId,
      poolAddress: pool,
      status: "preparing" as const,
    }));
    await db.insert(claims).values(claimRows);

    let prepared: Orynth.ClaimPrepareResponse;
    try {
      prepared = await Orynth.prepareEarningsClaim(poolAddresses);
    } catch (err) {
      await db.update(claims)
        .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Prepare failed", updatedAt: new Date() })
        .where(eq(claims.claimBatchId, claimBatchId));
      throw err;
    }

    const { id: orynthClaimId, preparedTxHex, amountSol } = prepared.claim;

    let signedTxHex: string;
    try {
      signedTxHex = Orynth.signClaimTx(preparedTxHex);
    } catch (err) {
      await db.update(claims)
        .set({ status: "failed", orynthClaimId, errorMessage: err instanceof Error ? err.message : "Sign failed", updatedAt: new Date() })
        .where(eq(claims.claimBatchId, claimBatchId));
      throw err;
    }

    await db.update(claims)
      .set({ orynthClaimId, amountSol, status: "signed", updatedAt: new Date() })
      .where(eq(claims.claimBatchId, claimBatchId));

    let submitted: Orynth.ClaimSubmitResponse;
    try {
      submitted = await Orynth.submitEarningsClaim(orynthClaimId, signedTxHex);
    } catch (err) {
      await db.update(claims)
        .set({ status: "failed", errorMessage: err instanceof Error ? err.message : "Submit failed", updatedAt: new Date() })
        .where(eq(claims.claimBatchId, claimBatchId));
      throw err;
    }

    const finalStatus = submitted.claim.status === "confirmed" ? "confirmed" : "submitted";
    await db.update(claims)
      .set({ status: finalStatus, signature: submitted.claim.signature ?? null, updatedAt: new Date() })
      .where(eq(claims.claimBatchId, claimBatchId));

    res.json({ success: true, claimBatchId, orynthClaimId, amountSol, status: finalStatus, signature: submitted.claim.signature });
  } catch (err) {
    console.error("❌ [Admin/claims] Error:", err);
    res.status(500).json({ success: false, error: err instanceof Error ? err.message : "Claim failed" });
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
