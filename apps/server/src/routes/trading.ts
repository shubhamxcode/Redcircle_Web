import { Router } from "express";
import { buyTokens, sellTokens, getTradingStats } from "../services/trading.service";
import { authenticateToken } from "../middleware/auth";
import { db } from "../db";
import * as schema from "../db";
import { eq, and } from "drizzle-orm";

const { holdings, transactions, priceHistory } = schema;

const router = Router();

/**
 * POST /api/trading/buy
 * Buy tokens from a post's DBC pool
 * Body: { postId, amountInSOL, walletAddress }
 * - amountInSOL: Amount of SOL to spend (not token amount)
 */
router.post("/buy", authenticateToken, async (req, res) => {
  try {
    const { postId, walletAddress } = req.body;
    const amountInSOL = req.body.amountInSOL ?? req.body.amount;

    // Validation
    if (!postId || amountInSOL === undefined || amountInSOL === null || !walletAddress) {
      return res.status(400).json({
        error: "Missing required fields: postId, amountInSOL, walletAddress",
      });
    }

    if (amountInSOL <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0",
      });
    }

    console.log(`\n🛒 Buy request: ${amountInSOL} SOL for post ${postId}`);

    const result = await buyTokens({
      postId,
      buyerWalletAddress: walletAddress,
      amountInSOL: parseFloat(amountInSOL),
    });
    const { success: _buySuccess, ...buyPayload } = result;

    res.json({
      success: true,
      message: "Transaction prepared. Please sign with your wallet.",
      ...buyPayload,
    });
  } catch (error: any) {
    console.error("❌ Buy tokens error:", error);
    res.status(500).json({
      error: "Failed to prepare buy transaction",
      details: error.message,
    });
  }
});

/**
 * POST /api/trading/sell
 * Sell tokens back to the bonding curve
 */
router.post("/sell", authenticateToken, async (req, res) => {
  try {
    const { postId, amount, walletAddress } = req.body;

    // Validation
    if (!postId || !amount || !walletAddress) {
      return res.status(400).json({
        error: "Missing required fields: postId, amount, walletAddress",
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        error: "Amount must be greater than 0",
      });
    }

    console.log(`\n💸 Sell request: ${amount} tokens for post ${postId}`);

    const result = await sellTokens({
      postId,
      sellerWalletAddress: walletAddress,
      amountInTokens: parseInt(amount),
    });
    const { success: _sellSuccess, ...sellPayload } = result;

    res.json({
      success: true,
      message: "Transaction prepared. Please sign with your wallet.",
      ...sellPayload,
    });
  } catch (error: any) {
    console.error("❌ Sell tokens error:", error);
    res.status(500).json({
      error: "Failed to prepare sell transaction",
      details: error.message,
    });
  }
});

/**
 * GET /api/trading/stats/:postId
 * Get trading statistics for a post
 */
router.get("/stats/:postId", async (req, res) => {
  try {
    const { postId } = req.params;

    const stats = await getTradingStats(postId);

    res.json({
      success: true,
      stats,
    });
  } catch (error: any) {
    console.error("❌ Get trading stats error:", error);
    res.status(500).json({
      error: "Failed to get trading stats",
      details: error.message,
    });
  }
});

/**
 * POST /api/trading/confirm
 * Confirm transaction and update holdings + record transaction history
 */
router.post("/confirm", authenticateToken, async (req, res) => {
  try {
    const { signature, postId, type, amount, price, walletAddress } = req.body;
    const userId = (req as any).userId;

    console.log(`\n✅ Transaction confirmed: ${signature}`);
    console.log(`   Post: ${postId}`);
    console.log(`   Type: ${type}`);
    console.log(`   User: ${userId}`);

    // Get post details
    const [post] = await db
      .select()
      .from(schema.posts)
      .where(eq(schema.posts.id, postId))
      .limit(1);

    if (!post || !post.tokenMintAddress) {
      throw new Error("Post or token mint not found");
    }

    // Calculate price per token
    const pricePerToken = price / (amount || 1);

    // Record transaction in history
    await db.insert(transactions).values({
      userId,
      postId,
      type,
      amount: amount || 0,
      pricePerToken: pricePerToken.toString(),
      totalValue: price.toString(),
      signature,
      tokenMintAddress: post.tokenMintAddress,
      walletAddress: walletAddress || '',
      networkFee: "0.000005", // Estimated Solana fee
      platformFee: "0",
      status: "confirmed",
    });

    console.log(`✅ Transaction recorded in history`);

    // Record price history
    try {
      await db.insert(priceHistory).values({
        postId,
        price: pricePerToken.toString(),
        volume: price.toString(),
        timestamp: new Date(),
      });
      console.log(`✅ Price history recorded`);
    } catch (priceError) {
      console.warn(`⚠️ Failed to record price history:`, priceError);
      // Don't fail the transaction if price history fails
    }

    // Get or create user holding
    const [existingHolding] = await db
      .select()
      .from(holdings)
      .where(
        and(
          eq(holdings.userId, userId),
          eq(holdings.postId, postId)
        )
      )
      .limit(1);

    if (type === "buy") {
      if (existingHolding) {
        // Update existing holding
        const newAmount = existingHolding.amount + (amount || 0);
        const newTotalInvested = parseFloat(existingHolding.totalInvested) + (price || 0);
        const newAverageBuyPrice = newTotalInvested / newAmount;

        await db
          .update(holdings)
          .set({
            amount: newAmount,
            totalInvested: newTotalInvested.toString(),
            averageBuyPrice: newAverageBuyPrice.toString(),
            updatedAt: new Date(),
          })
          .where(eq(holdings.id, existingHolding.id));

        console.log(`✅ Updated holding: ${newAmount} tokens`);
      } else {
        // Create new holding
        await db.insert(holdings).values({
          userId,
          postId,
          tokenMintAddress: post.tokenMintAddress,
          amount: amount || 0,
          averageBuyPrice: (price / (amount || 1)).toString(),
          totalInvested: price.toString(),
          totalRealized: "0",
        });

        console.log(`✅ Created new holding: ${amount} tokens`);
      }
    } else if (type === "sell" && existingHolding) {
      // Update holding for sell
      const newAmount = existingHolding.amount - (amount || 0);
      const newTotalRealized = parseFloat(existingHolding.totalRealized) + (price || 0);

      if (newAmount > 0) {
        await db
          .update(holdings)
          .set({
            amount: newAmount,
            totalRealized: newTotalRealized.toString(),
            updatedAt: new Date(),
          })
          .where(eq(holdings.id, existingHolding.id));

        console.log(`✅ Updated holding: ${newAmount} tokens remaining`);
      } else {
        // Sold all tokens, delete holding
        await db
          .delete(holdings)
          .where(eq(holdings.id, existingHolding.id));

        console.log(`✅ Holding closed (all tokens sold)`);
      }
    }

    res.json({
      success: true,
      message: "Transaction confirmed and holdings updated",
      signature,
    });
  } catch (error: any) {
    console.error("❌ Confirm transaction error:", error);
    res.status(500).json({
      error: "Failed to confirm transaction",
      details: error.message,
    });
  }
});

export default router;

