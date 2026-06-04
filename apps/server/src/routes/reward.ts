import express, { type Request, type Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer, getAccount } from "@solana/spl-token";
import bs58 from "bs58";
import { db } from "../db";
import { posts, launches, users } from "../db";
import { authenticateToken } from "../middleware/auth";
import { resolvePostById } from "../db/helpers";
import * as Orynth from "../services/orynth.service";

const router: express.Router = express.Router();

// USDC on Solana mainnet
const USDC_MINT    = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;

function getRewardKeypair(): Keypair {
  const key = process.env.REWARD_WALLET_PRIVATE_KEY;
  if (!key) throw new Error("REWARD_WALLET_PRIVATE_KEY not configured");
  return Keypair.fromSecretKey(bs58.decode(key));
}

// Singleton connection — reused across requests to avoid repeated WebSocket churn
let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) {
    const rpc = process.env.SOLANA_MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    _connection = new Connection(rpc, "confirmed");
  }
  return _connection;
}

// ─── POST /api/reward ─────────────────────────────────────────────────────────
// Transfers the creator's USDC share from the RedCircle reward wallet to their
// Solana wallet. Auth required; caller must be the original Reddit post author.
//
// Race-condition protection: we write the new creatorRewards value to the DB
// BEFORE the on-chain transfer (optimistic lock). If two requests arrive
// simultaneously only one will succeed the conditional WHERE clause. If the
// transfer itself fails, we roll back the DB value so the creator can retry.

router.post("/", authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tokenId, walletAddress } = z
      .object({
        tokenId:       z.string().min(1),
        walletAddress: z.string().min(32),
      })
      .parse(req.body);

    const userId = req.userId;
    if (!userId) return res.status(401).json({ success: false, error: "Unauthorized" });

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
    const post = await resolvePostById(tokenId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    // 3. Only the original Reddit post author can claim
    if (!dbUser.username || dbUser.username.toLowerCase() !== post.author.toLowerCase()) {
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
      return res.status(400).json({ success: false, error: "Invalid Solana wallet address" });
    }

    // 5. Calculate claimable earnings from Orynth
    const [launch] = await db
      .select({
        poolAddress:   launches.poolAddress,
        creatorFeeBps: launches.creatorFeeBps,
        partnerFeeBps: launches.partnerFeeBps,
      })
      .from(launches)
      .where(
        and(
          eq(launches.status,   "confirmed"),
          eq(launches.sourceId, post.redditPostId),
        ),
      )
      .limit(1);

    if (!launch?.poolAddress) {
      return res.status(400).json({ success: false, error: "No active pool found for this token" });
    }

    const earningsRes = await Orynth.getEarnings([launch.poolAddress]);
    const earning     = earningsRes.earnings?.[0];
    if (!earning) {
      return res.status(400).json({ success: false, error: "No earnings data available" });
    }

    const claimableUsdc = parseFloat(earning.claimableUsdc ?? "0");
    const creatorBps    = launch.creatorFeeBps ?? 50;
    const partnerBps    = launch.partnerFeeBps ?? 105;
    const share         = partnerBps > 0 ? creatorBps / partnerBps : 0.5;
    const creatorUsdc   = claimableUsdc * share;

    const alreadyPaid  = parseFloat(post.creatorRewards ?? "0");
    const amountToSend = Math.max(0, creatorUsdc - alreadyPaid);

    if (amountToSend < 0.001) {
      return res.status(400).json({ success: false, error: "No new earnings to claim yet" });
    }

    const lamports = Math.floor(amountToSend * 10 ** USDC_DECIMALS);

    // 6. Optimistic DB lock — write the new total BEFORE the transfer.
    //    The WHERE checks the current value so only one concurrent request wins.
    const [locked] = await db
      .update(posts)
      .set({ creatorRewards: creatorUsdc.toFixed(6), updatedAt: new Date() })
      .where(
        and(
          eq(posts.id,             post.id),
          eq(posts.creatorRewards, post.creatorRewards ?? "0"),
        ),
      )
      .returning({ id: posts.id });

    if (!locked) {
      return res.status(409).json({
        success: false,
        error: "A claim is already in progress for this token. Please try again shortly.",
      });
    }

    // 7. Transfer USDC — roll back the DB lock if anything fails
    const connection     = getConnection();
    const rewardKeypair  = getRewardKeypair();

    let signature: string;
    try {
      const fromAta = await getOrCreateAssociatedTokenAccount(
        connection, rewardKeypair, USDC_MINT, rewardKeypair.publicKey,
      );

      // Pre-flight: check platform wallet has enough USDC
      const fromAccount = await getAccount(connection, fromAta.address);
      if (fromAccount.amount < BigInt(lamports)) {
        // Roll back the optimistic lock
        await db.update(posts)
          .set({ creatorRewards: (post.creatorRewards ?? "0"), updatedAt: new Date() })
          .where(eq(posts.id, post.id));
        return res.status(503).json({
          success: false,
          error: "Insufficient platform USDC balance. Please try again later.",
        });
      }

      const toAta = await getOrCreateAssociatedTokenAccount(
        connection, rewardKeypair, USDC_MINT, destPubkey,
      );

      console.log(`💸 [Reward] Sending ${amountToSend.toFixed(4)} USDC → ${walletAddress}`);

      signature = await transfer(
        connection,
        rewardKeypair,
        fromAta.address,
        toAta.address,
        rewardKeypair,
        lamports,
      );

      // Wait for on-chain confirmation before declaring success
      const { value: status } = await connection.confirmTransaction(signature, "confirmed");
      if (status?.err) {
        throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`);
      }

      console.log(`✅ [Reward] Transfer confirmed: ${signature}`);
    } catch (transferErr) {
      // Roll back the optimistic lock so the creator can retry
      await db.update(posts)
        .set({ creatorRewards: (post.creatorRewards ?? "0"), updatedAt: new Date() })
        .where(eq(posts.id, post.id));
      throw transferErr;
    }

    return res.json({
      success:       true,
      signature,
      amount:        amountToSend.toFixed(4),
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
