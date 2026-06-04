import express, { type Request, type Response } from "express";
import { z } from "zod";
import { eq, and, or, ilike } from "drizzle-orm";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer } from "@solana/spl-token";
import bs58 from "bs58";
import { db } from "../db";
import { posts, launches, users } from "../db";
import { authenticateToken } from "../middleware/auth";
import * as Orynth from "../services/orynth.service";

const router: express.Router = express.Router();

// USDC on Solana mainnet
const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;

function getRewardKeypair(): Keypair {
  const key = process.env.REWARD_WALLET_PRIVATE_KEY;
  if (!key) throw new Error("REWARD_WALLET_PRIVATE_KEY not configured");
  return Keypair.fromSecretKey(bs58.decode(key));
}

function getConnection(): Connection {
  const rpc =
    process.env.SOLANA_MAINNET_RPC_URL ||
    "https://api.mainnet-beta.solana.com";
  return new Connection(rpc, "confirmed");
}

async function resolvePost(tokenId: string) {
  const [bySlug] = await db
    .select()
    .from(posts)
    .where(eq(posts.tokenSlug, tokenId))
    .limit(1);
  if (bySlug) return bySlug;

  const dash = tokenId.lastIndexOf("-");
  if (dash > 0) {
    const sym = tokenId.slice(0, dash);
    const shortMint = tokenId.slice(dash + 1);
    if (shortMint.length === 6) {
      const [byLegacy] = await db
        .select()
        .from(posts)
        .where(
          and(
            ilike(posts.tokenSymbol, sym),
            ilike(posts.tokenMintAddress, `${shortMint}%`),
          ),
        )
        .limit(1);
      if (byLegacy) return byLegacy;
    }
  }

  const [byOther] = await db
    .select()
    .from(posts)
    .where(
      or(
        eq(posts.id, tokenId),
        eq(posts.tokenMintAddress, tokenId),
        ilike(posts.tokenSymbol, tokenId),
      ),
    )
    .limit(1);
  return byOther ?? null;
}

// ─── POST /api/reward ─────────────────────────────────────────────────────────
// Sends the creator's USDC earnings from the Redcircle wallet to their Solana
// wallet. Auth required; caller must be the original Reddit post author.

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tokenId, walletAddress } = z
      .object({
        tokenId: z.string().min(1),
        walletAddress: z.string().min(32),
      })
      .parse(req.body);

    const userId = (req as any).userId as string;

    // 1. Verify caller
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!dbUser) {
      return res.status(401).json({ success: false, error: "User not found" });
    }

    // 2. Resolve post
    const post = await resolvePost(tokenId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    // 3. Only the original Reddit post author can claim
    if (
      !dbUser.username ||
      dbUser.username.toLowerCase() !== post.author.toLowerCase()
    ) {
      return res.status(403).json({
        success: false,
        error: "Only the original post creator can claim rewards",
      });
    }

    // 4. Validate destination wallet
    let destPubkey: PublicKey;
    try {
      destPubkey = new PublicKey(walletAddress);
    } catch {
      return res
        .status(400)
        .json({ success: false, error: "Invalid Solana wallet address" });
    }

    // 5. Calculate claimable earnings from Orynth
    const [launch] = await db
      .select({
        poolAddress: launches.poolAddress,
        creatorFeeBps: launches.creatorFeeBps,
        partnerFeeBps: launches.partnerFeeBps,
      })
      .from(launches)
      .where(
        and(
          eq(launches.status, "confirmed"),
          eq(launches.sourceId, post.redditPostId),
        ),
      )
      .limit(1);

    if (!launch?.poolAddress) {
      return res
        .status(400)
        .json({ success: false, error: "No active pool found for this token" });
    }

    const earningsRes = await Orynth.getEarnings([launch.poolAddress]);
    const earning = earningsRes.earnings?.[0];
    if (!earning) {
      return res
        .status(400)
        .json({ success: false, error: "No earnings data available" });
    }

    const claimableUsdc = parseFloat(earning.claimableUsdc ?? "0");
    const creatorBps = launch.creatorFeeBps ?? 50;
    const partnerBps = launch.partnerFeeBps ?? 105;
    const share = partnerBps > 0 ? creatorBps / partnerBps : 0.5;
    const creatorUsdc = claimableUsdc * share;

    const alreadyPaid = parseFloat(post.creatorRewards ?? "0");
    const amountToSend = Math.max(0, creatorUsdc - alreadyPaid);

    if (amountToSend < 0.001) {
      return res.status(400).json({
        success: false,
        error: "No new earnings to claim yet",
      });
    }

    // 6. Transfer USDC from Redcircle wallet → creator wallet
    const connection = getConnection();
    const rewardKeypair = getRewardKeypair();
    const lamports = Math.floor(amountToSend * 10 ** USDC_DECIMALS);

    console.log(
      `💸 [Reward] Sending ${amountToSend.toFixed(4)} USDC → ${walletAddress}`,
    );

    const fromAta = await getOrCreateAssociatedTokenAccount(
      connection,
      rewardKeypair,
      USDC_MINT,
      rewardKeypair.publicKey,
    );

    const toAta = await getOrCreateAssociatedTokenAccount(
      connection,
      rewardKeypair,
      USDC_MINT,
      destPubkey,
    );

    const signature = await transfer(
      connection,
      rewardKeypair,
      fromAta.address,
      toAta.address,
      rewardKeypair,
      lamports,
    );

    console.log(`✅ [Reward] Transfer confirmed: ${signature}`);

    // 7. Record payout to prevent double-claiming
    await db
      .update(posts)
      .set({
        creatorRewards: (alreadyPaid + amountToSend).toFixed(6),
        updatedAt: new Date(),
      })
      .where(eq(posts.id, post.id));

    return res.json({
      success: true,
      signature,
      amount: amountToSend.toFixed(4),
      walletAddress,
    });
  } catch (err) {
    console.error("❌ [Reward] Error:", err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : "Reward transfer failed",
    });
  }
});

export default router;
