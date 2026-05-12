import "dotenv/config";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, Transaction } from "@solana/web3.js";
import { eq } from "drizzle-orm";
import { db, posts } from "../db/index.js";
import { buyTokens, sellTokens } from "../services/trading.service.js";
import { getRedCircleConnection } from "../services/redcircle-protocol.service.js";
import { recordConfirmedRedCircleTrade } from "../services/redcircle-indexer.service.js";

type Side = "buy" | "sell";

type Bot = {
  id: number;
  keypair: Keypair;
};

const DEFAULT_POST_ID = "fd80e71e-f063-48f6-bdf2-fe1211af32ee";
const DEFAULT_PAGE_URL = `http://localhost:3001/token/${DEFAULT_POST_ID}`;

const args = parseArgs(process.argv.slice(2));
const postId = args.postId || DEFAULT_POST_ID;
const pageUrl = args.url || `http://localhost:3001/token/${postId}`;
const botCount = Number(args.bots || 3);
const minSol = Number(args.minSol || 0.01);
const maxSol = Number(args.maxSol || 0.08);
const intervalMs = Number(args.intervalMs || 4_000);

const connection = getRedCircleConnection();

main().catch((error) => {
  console.error("local-trading-bots failed:", error);
  process.exit(1);
});

async function main() {
  const [post] = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
  if (!post) throw new Error(`Post not found: ${postId}`);
  if (!post.redCirclePoolAddress || !post.tokenMintAddress) {
    throw new Error(`Post is not tokenized/tradeable yet: ${postId}`);
  }

  console.log("RedCircle local trading bots");
  console.log(`Post: ${postId}`);
  console.log(`Page: ${pageUrl}`);
  console.log(`RPC:  ${process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com"}`);

  const bots = Array.from({ length: botCount }, (_, index) => ({
    id: index + 1,
    keypair: Keypair.generate(),
  }));

  await Promise.all(bots.map((bot) => fundBot(bot)));
  bots.forEach((bot) => runBot(bot, post.tokenMintAddress as string));

  process.on("SIGINT", () => {
    console.log("\nStopping local trading bots.");
    process.exit(0);
  });
}

async function fundBot(bot: Bot) {
  const balance = await connection.getBalance(bot.keypair.publicKey);
  if (balance >= 5 * LAMPORTS_PER_SOL) {
    log(bot, `balance ${(balance / LAMPORTS_PER_SOL).toFixed(3)} SOL`);
    return;
  }

  const signature = await connection.requestAirdrop(
    bot.keypair.publicKey,
    20 * LAMPORTS_PER_SOL,
  );
  const blockhash = await connection.getLatestBlockhash("confirmed");
  await connection.confirmTransaction({ signature, ...blockhash }, "confirmed");
  const nextBalance = await connection.getBalance(bot.keypair.publicKey);
  log(bot, `funded ${(nextBalance / LAMPORTS_PER_SOL).toFixed(3)} SOL at ${bot.keypair.publicKey.toBase58()}`);
}

async function runBot(bot: Bot, tokenMint: string) {
  while (true) {
    try {
      await browsePage(bot);
      const tokenBalance = await getTokenBalance(bot.keypair.publicKey, tokenMint);
      const side: Side = tokenBalance > 1 && Math.random() < 0.35 ? "sell" : "buy";

      if (side === "buy") {
        const amount = randomBetween(minSol, maxSol);
        await executeTrade(bot, "buy", amount);
      } else {
        const amount = Math.max(0.000001, tokenBalance * randomBetween(0.1, 0.35));
        await executeTrade(bot, "sell", amount);
      }
    } catch (error) {
      log(bot, `error: ${error instanceof Error ? error.message : String(error)}`);
    }

    await sleep(intervalMs + Math.floor(Math.random() * intervalMs));
  }
}

async function browsePage(bot: Bot) {
  try {
    const response = await fetch(pageUrl, { cache: "no-store" });
    log(bot, `loaded page ${response.status}`);
  } catch {
    log(bot, "page fetch skipped; frontend may not be running");
  }
}

async function executeTrade(bot: Bot, side: Side, amount: number) {
  const walletAddress = bot.keypair.publicKey.toBase58();
  const result =
    side === "buy"
      ? await buyTokens({
          postId,
          buyerWalletAddress: walletAddress,
          amountInSOL: amount,
          slippageBps: 300,
        })
      : await sellTokens({
          postId,
          sellerWalletAddress: walletAddress,
          amountInTokens: amount,
          slippageBps: 300,
        });

  const tx = Transaction.from(Buffer.from(result.transaction, "base64"));
  const latestBlockhash = await connection.getLatestBlockhash("confirmed");
  tx.recentBlockhash = latestBlockhash.blockhash;
  tx.feePayer = bot.keypair.publicKey;
  tx.sign(bot.keypair);

  const rawTransaction = tx.serialize();
  const signature = await connection.sendRawTransaction(rawTransaction, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
    maxRetries: 0,
  });

  while (true) {
    const [{ value: statuses }, blockHeight] = await Promise.all([
      connection.getSignatureStatuses([signature]),
      connection.getBlockHeight("confirmed"),
    ]);
    const status = statuses[0];

    if (status?.err) throw new Error(`${side} failed: ${JSON.stringify(status.err)}`);
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") break;
    if (blockHeight > latestBlockhash.lastValidBlockHeight) {
      throw new Error(`${side} expired before confirmation: ${signature}`);
    }

    await connection
      .sendRawTransaction(rawTransaction, { skipPreflight: true, maxRetries: 0 })
      .catch(() => undefined);
    await sleep(500);
  }

  const protocolPostId = (await getProtocolPostId()) || postId;
  const summary = await recordConfirmedRedCircleTrade({
    signature,
    postId,
    protocolPostId,
    side,
    quote: result.quote,
  });

  await db
    .update(posts)
    .set({
      currentPrice: summary.currentPrice.toString(),
      totalVolume: summary.totalVolume.toString(),
      marketCap: (summary.currentPrice * summary.tokenSupply).toString(),
      updatedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  log(
    bot,
    `${side} ${amount.toFixed(6)} ${side === "buy" ? "SOL" : "tokens"} -> ${signature}`,
  );
}

async function getProtocolPostId() {
  const [post] = await db
    .select({
      redCirclePostId: posts.redCirclePostId,
      redditPostId: posts.redditPostId,
    })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  return post?.redCirclePostId || post?.redditPostId;
}

async function getTokenBalance(owner: PublicKey, tokenMint: string) {
  const accounts = await connection.getParsedTokenAccountsByOwner(owner, {
    mint: new PublicKey(tokenMint),
  });

  return accounts.value.reduce((sum, account) => {
    const uiAmount = account.account.data.parsed.info.tokenAmount.uiAmount || 0;
    return sum + uiAmount;
  }, 0);
}

function parseArgs(argv: string[]) {
  const parsed: Record<string, string> = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const key = arg.slice(2);
    const value = argv[index + 1];
    if (value && !value.startsWith("--")) {
      parsed[key] = value;
      index += 1;
    }
  }
  return parsed;
}

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function log(bot: Bot, message: string) {
  console.log(`[bot ${bot.id}] ${message}`);
}
