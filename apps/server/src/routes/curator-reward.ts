import express, { type Request, type Response } from "express";
import { z } from "zod";
import { eq, and } from "drizzle-orm";
import { Connection, PublicKey, Keypair } from "@solana/web3.js";
import { getOrCreateAssociatedTokenAccount, transfer, getAccount } from "@solana/spl-token";
import bs58 from "bs58";
import { db } from "../db";
import { posts, launches } from "../db";
import { resolvePostById } from "../db/helpers";
import * as Orynth from "../services/orynth.service";

const router: express.Router = express.Router();

const USDC_MINT     = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const USDC_DECIMALS = 6;

function getRewardKeypair(): Keypair {
  const key = process.env.REWARD_WALLET_PRIVATE_KEY;
  if (!key) throw new Error("REWARD_WALLET_PRIVATE_KEY not configured");
  return Keypair.fromSecretKey(bs58.decode(key));
}

let _connection: Connection | null = null;
function getConnection(): Connection {
  if (!_connection) {
    const rpc = process.env.SOLANA_MAINNET_RPC_URL ?? "https://api.mainnet-beta.solana.com";
    _connection = new Connection(rpc, "confirmed");
  }
  return _connection;
}

// ─── POST /api/curator-reward ─────────────────────────────────────────────────
// Transfers the curator's USDC share to the wallet they registered at launch.
// No auth required — the curator's wallet address IS their identity token.
// The provided walletAddress must match the curatorWalletAddress stored on the
// launch record; if it doesn't match, the request is rejected.

router.post("/", async (req: Request, res: Response) => {
  try {
    const { tokenId, walletAddress } = z
      .object({
        tokenId:       z.string().min(1),
        walletAddress: z.string().min(32).max(44),
      })
      .parse(req.body);

    // 1. Resolve post
    const post = await resolvePostById(tokenId);
    if (!post) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    // 2. Find the confirmed launch and verify curator wallet
    const [launch] = await db
      .select({
        poolAddress:          launches.poolAddress,
        curatorFeeBps:        launches.curatorFeeBps,
        partnerFeeBps:        launches.partnerFeeBps,
        curatorWalletAddress: launches.curatorWalletAddress,
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

    if (!launch.curatorWalletAddress) {
      return res.status(400).json({
        success: false,
        error: "No curator wallet was registered at launch time. Curator rewards are not claimable for this token.",
      });
    }

    if (launch.curatorWalletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: "Wallet address does not match the curator wallet registered at launch.",
      });
    }

    // 3. Validate destination wallet
    let destPubkey: PublicKey;
    try {
      destPubkey = new PublicKey(walletAddress);
    } catch {
      return res.status(400).json({ success: false, error: "Invalid Solana wallet address" });
    }

    // 4. Calculate claimable curator earnings from Orynth
    const earningsRes = await Orynth.getEarnings([launch.poolAddress]);
    const earning     = earningsRes.earnings?.[0];
    if (!earning) {
      return res.status(400).json({ success: false, error: "No earnings data available" });
    }

    const claimableUsdc = parseFloat(earning.claimableUsdc ?? "0");
    const curatorBps    = launch.curatorFeeBps ?? 15;
    const partnerBps    = launch.partnerFeeBps ?? 105;
    const share         = partnerBps > 0 ? curatorBps / partnerBps : 0;
    const curatorUsdc   = claimableUsdc * share;

    const alreadyPaid  = parseFloat(post.curatorRewards ?? "0");
    const amountToSend = Math.max(0, curatorUsdc - alreadyPaid);

    if (amountToSend < 0.001) {
      return res.status(400).json({ success: false, error: "No new curator earnings to claim yet" });
    }

    const lamports = Math.floor(amountToSend * 10 ** USDC_DECIMALS);

    // 5. Optimistic DB lock
    const [locked] = await db
      .update(posts)
      .set({ curatorRewards: curatorUsdc.toFixed(6), updatedAt: new Date() })
      .where(
        and(
          eq(posts.id,             post.id),
          eq(posts.curatorRewards, post.curatorRewards ?? "0"),
        ),
      )
      .returning({ id: posts.id });

    if (!locked) {
      return res.status(409).json({
        success: false,
        error: "A curator claim is already in progress for this token. Please try again shortly.",
      });
    }

    // 6. Transfer USDC
    const connection    = getConnection();
    const rewardKeypair = getRewardKeypair();

    let signature: string;
    try {
      const fromAta = await getOrCreateAssociatedTokenAccount(
        connection, rewardKeypair, USDC_MINT, rewardKeypair.publicKey,
      );

      const fromAccount = await getAccount(connection, fromAta.address);
      if (fromAccount.amount < BigInt(lamports)) {
        await db.update(posts)
          .set({ curatorRewards: (post.curatorRewards ?? "0"), updatedAt: new Date() })
          .where(eq(posts.id, post.id));
        return res.status(503).json({
          success: false,
          error: "Insufficient platform USDC balance. Please try again later.",
        });
      }

      const toAta = await getOrCreateAssociatedTokenAccount(
        connection, rewardKeypair, USDC_MINT, destPubkey,
      );

      console.log(`💸 [CuratorReward] Sending ${amountToSend.toFixed(4)} USDC → ${walletAddress}`);

      signature = await transfer(
        connection,
        rewardKeypair,
        fromAta.address,
        toAta.address,
        rewardKeypair,
        lamports,
      );

      const { value: status } = await connection.confirmTransaction(signature, "confirmed");
      if (status?.err) {
        throw new Error(`Transaction failed on-chain: ${JSON.stringify(status.err)}`);
      }

      console.log(`✅ [CuratorReward] Transfer confirmed: ${signature}`);
    } catch (transferErr) {
      await db.update(posts)
        .set({ curatorRewards: (post.curatorRewards ?? "0"), updatedAt: new Date() })
        .where(eq(posts.id, post.id));
      throw transferErr;
    }

    return res.json({
      success: true,
      signature,
      amount:  amountToSend.toFixed(4),
      walletAddress,
    });
  } catch (err) {
    console.error("❌ [CuratorReward] Error:", err);
    const msg = err instanceof Error ? err.message : "";
    const userMsg = msg.includes("Failed query") || msg.includes("column")
      ? "Something went wrong fetching reward data. Please try again."
      : msg || "Curator reward transfer failed";
    return res.status(500).json({ success: false, error: userMsg });
  }
});

export default router;
