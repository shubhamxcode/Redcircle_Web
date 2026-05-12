import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import BN from "bn.js";
import bs58 from "bs58";
import protocolSdk from "@redcircle/protocol-sdk";

const {
  RedCircleClient,
  PROGRAM_ID,
  TOKEN_DECIMALS,
  TOKEN_UNIT,
  LAMPORTS_PER_SOL,
  calculateFeeBreakdown,
  calculateSigmoidMarketCap,
  estimateDlmmBuyTokensOut,
  estimateDlmmSellSolOut,
  estimateSigmoidBuyTokensOut,
  estimateSigmoidSellSolOut,
  parsePoolModel,
  parsePoolStatus,
  priceAtSupply,
} = protocolSdk;

const COMPUTE_UNIT_LIMIT = 400_000;
const DEFAULT_SLIPPAGE_BPS = 100;

type RedCircleProvider = {
  connection: Connection;
  wallet: {
    publicKey: PublicKey;
    signTransaction: <T>(tx: T) => Promise<T>;
    signAllTransactions: <T>(txs: T[]) => Promise<T[]>;
  };
  opts: {
    commitment: "confirmed";
    preflightCommitment: "confirmed";
  };
};

export type TradeSide = "buy" | "sell";

export type RedCircleQuote = {
  side: TradeSide;
  poolModel: string;
  amountInRaw: string;
  amountOutRaw: string;
  minimumAmountOutRaw: string;
  amountIn: number;
  amountOut: number;
  minimumAmountOut: number;
  priceLamportsPerToken: string;
  priceSolPerToken: number;
  slippageBps: number;
  activeBin?: string | null;
  fees: {
    total: number;
    platform: number;
    creator: number;
    curator: number;
    growth: number;
  };
};

export type RedCirclePoolSummary = {
  programId: string;
  postId: string;
  pool: string;
  marketState: string;
  tokenMint: string;
  poolSolVault: string;
  poolTokenVault: string;
  status: string;
  model: string;
  currentPrice: number;
  priceLamportsPerToken: string;
  tokenSupply: number;
  tokensSold: number;
  availableSupply: number;
  solReserve: number;
  tokenReserve: number;
  totalVolume: number;
  totalFees: number;
  totalTrades: number;
  launchProtectionEndsAt: number;
  maxBuyDuringProtection: number;
  fees: {
    creator: number;
    curator: number;
    growth: number;
    platform: number;
    unclaimedCreator: number;
    unclaimedCurator: number;
    unclaimedGrowth: number;
  };
};

export type CreateRedCirclePoolParams = {
  postId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenSupply: number;
  initialPriceSol: number;
  uri?: string;
};

export type CreateRedCirclePoolResult = {
  mintAddress: string;
  poolAddress: string;
  marketStateAddress: string;
  poolSolVaultAddress: string;
  poolTokenVaultAddress: string;
  configAddress: string;
  signature: string;
  decimals: number;
  explorerUrl: string;
  initialPrice: number;
};

type BuiltRedCircleTransaction = {
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
};

type BuiltLegacyRedCircleTransaction = {
  transaction: Transaction;
  blockhash: string;
  lastValidBlockHeight: number;
};

function getRpcUrl() {
  const rpcUrl = process.env.SOLANA_RPC_URL;
  if (!rpcUrl && process.env.NODE_ENV === "production") {
    throw new Error("SOLANA_RPC_URL must be set in production");
  }
  return rpcUrl || "https://api.devnet.solana.com";
}

export function getRedCircleConnection() {
  return new Connection(getRpcUrl(), "confirmed");
}

export function getRedCircleProgramId() {
  return new PublicKey(process.env.REDCIRCLE_PROGRAM_ID || PROGRAM_ID.toBase58());
}

export function getAuthorityKeypair(): Keypair {
  const privateKey = process.env.SOLANA_AUTHORITY_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error("SOLANA_AUTHORITY_PRIVATE_KEY is required for RedCircle pool creation");
  }

  try {
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  } catch {
    throw new Error("Invalid SOLANA_AUTHORITY_PRIVATE_KEY format. Must be base58 encoded.");
  }
}

function getReadOnlyProvider(connection = getRedCircleConnection()): RedCircleProvider {
  const publicKey = PublicKey.default;
  return {
    connection,
    wallet: {
      publicKey,
      signTransaction: async (tx) => tx,
      signAllTransactions: async (txs) => txs,
    },
    opts: {
      commitment: "confirmed",
      preflightCommitment: "confirmed",
    },
  };
}

export function getRedCircleClient(connection = getRedCircleConnection()) {
  return new RedCircleClient(getReadOnlyProvider(connection) as never, {
    programId: getRedCircleProgramId(),
  });
}

async function buildVersionedTransaction(
  connection: Connection,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  opts: { computeUnitLimit?: number } = {}
): Promise<BuiltRedCircleTransaction> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
  const finalInstructions = [...instructions];

  if (opts.computeUnitLimit != null) {
    finalInstructions.unshift(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: opts.computeUnitLimit,
      })
    );
  }

  const message = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: blockhash,
    instructions: finalInstructions,
  }).compileToV0Message();

  return {
    transaction: new VersionedTransaction(message),
    blockhash,
    lastValidBlockHeight,
  };
}

async function buildLegacyTransaction(
  connection: Connection,
  payer: PublicKey,
  instructions: TransactionInstruction[],
  opts: { computeUnitLimit?: number } = {}
): Promise<BuiltLegacyRedCircleTransaction> {
  const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
  const transaction = new Transaction({
    feePayer: payer,
    recentBlockhash: blockhash,
  });

  if (opts.computeUnitLimit != null) {
    transaction.add(
      ComputeBudgetProgram.setComputeUnitLimit({
        units: opts.computeUnitLimit,
      })
    );
  }

  transaction.add(...instructions);

  return {
    transaction,
    blockhash,
    lastValidBlockHeight,
  };
}

function solToLamports(sol: number): BN {
  return new BN(Math.floor(sol * LAMPORTS_PER_SOL));
}

function tokensToRaw(tokens: number): BN {
  return new BN(Math.floor(tokens * Number(TOKEN_UNIT.toString())));
}

function lamportsToSol(value: BN): number {
  return Number(value.toString()) / LAMPORTS_PER_SOL;
}

function rawTokensToUi(value: BN): number {
  return Number(value.toString()) / Number(TOKEN_UNIT.toString());
}

function applySlippage(value: BN, slippageBps: number): BN {
  const clamped = Math.max(0, Math.min(10_000, slippageBps));
  return value.muln(10_000 - clamped).divn(10_000);
}

function feeBreakdownToSol(amount: BN) {
  const fees = calculateFeeBreakdown(amount);
  return {
    total: lamportsToSol(fees.total),
    platform: lamportsToSol(fees.platform),
    creator: lamportsToSol(fees.creator),
    curator: lamportsToSol(fees.curator),
    growth: lamportsToSol(fees.growth),
  };
}

async function getTreasury(client = getRedCircleClient()): Promise<PublicKey> {
  const configured = process.env.REDCIRCLE_TREASURY_PUBLIC_KEY;
  if (configured) return new PublicKey(configured);
  return (await client.fetchConfig()).treasury;
}

export async function getCuratorForTrade(curatorAddress?: string | null): Promise<PublicKey> {
  const fallback =
    curatorAddress ||
    process.env.REDCIRCLE_DEFAULT_CURATOR_PUBLIC_KEY ||
    process.env.REDCIRCLE_TREASURY_PUBLIC_KEY;

  if (fallback) return new PublicKey(fallback);
  return getAuthorityKeypair().publicKey;
}

export async function createRedCirclePool(
  params: CreateRedCirclePoolParams
): Promise<CreateRedCirclePoolResult> {
  const connection = getRedCircleConnection();
  const client = getRedCircleClient(connection);
  const authority = getAuthorityKeypair();
  const treasury = await getTreasury(client);
  const addrs = client.derivePoolAddresses(params.postId);
  const tokenSupply = tokensToRaw(params.tokenSupply);
  const floorPrice = solToLamports(params.initialPriceSol);
  const capPrice = BN.max(floorPrice.muln(100), floorPrice.addn(1));

  const ix = await client.createPool(authority.publicKey, treasury, {
    postId: params.postId,
    name: params.tokenName.slice(0, 32),
    symbol: params.tokenSymbol.slice(0, 8),
    uri: params.uri || "",
    tokenSupply,
    sigmoidFloorPrice: floorPrice,
    sigmoidCapPrice: capPrice,
    sigmoidMidpointSupply: tokenSupply.divn(2),
    sigmoidSteepnessBps: new BN(10_000),
  });

  const builtTx = await buildVersionedTransaction(connection, authority.publicKey, [ix], {
    computeUnitLimit: COMPUTE_UNIT_LIMIT,
  });
  const tx = builtTx.transaction;
  tx.sign([authority]);

  const signature = await (connection as any).sendTransaction(tx, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });
  await connection.confirmTransaction(
    {
      signature,
      blockhash: builtTx.blockhash,
      lastValidBlockHeight: builtTx.lastValidBlockHeight,
    },
    "confirmed"
  );

  const network = getRpcUrl().includes("devnet") ? "devnet" : "mainnet";

  return {
    mintAddress: addrs.tokenMint.toBase58(),
    poolAddress: addrs.pool.toBase58(),
    marketStateAddress: addrs.marketState.toBase58(),
    poolSolVaultAddress: addrs.poolSolVault.toBase58(),
    poolTokenVaultAddress: addrs.poolTokenVault.toBase58(),
    configAddress: addrs.config.toBase58(),
    signature,
    decimals: TOKEN_DECIMALS,
    explorerUrl: `https://solscan.io/token/${addrs.tokenMint.toBase58()}?cluster=${network}`,
    initialPrice: params.initialPriceSol,
  };
}

export async function getRedCirclePoolSummary(protocolPostId: string): Promise<RedCirclePoolSummary> {
  const client = getRedCircleClient();
  const addrs = client.derivePoolAddresses(protocolPostId);
  const [pool, market, config] = await Promise.all([
    client.fetchPool(protocolPostId),
    client.fetchMarketState(protocolPostId),
    client.fetchConfig(),
  ]);
  const model = parsePoolModel(pool.model);
  const status = parsePoolStatus(pool.status);
  const price =
    model === "dlmm"
      ? (await client.fetchBin(addrs.pool, market.dlmm.activeBinId)).priceLamportsPerToken
      : priceAtSupply(market.sigmoid, pool.tokensSold);

  return {
    programId: getRedCircleProgramId().toBase58(),
    postId: protocolPostId,
    pool: addrs.pool.toBase58(),
    marketState: addrs.marketState.toBase58(),
    tokenMint: addrs.tokenMint.toBase58(),
    poolSolVault: addrs.poolSolVault.toBase58(),
    poolTokenVault: addrs.poolTokenVault.toBase58(),
    status,
    model,
    currentPrice: lamportsToSol(price),
    priceLamportsPerToken: price.toString(),
    tokenSupply: rawTokensToUi(pool.tokenSupply),
    tokensSold: rawTokensToUi(pool.tokensSold),
    availableSupply: rawTokensToUi(pool.liquidityTokenReserve),
    solReserve: lamportsToSol(pool.liquiditySolReserve),
    tokenReserve: rawTokensToUi(pool.liquidityTokenReserve),
    totalVolume: lamportsToSol(pool.totalVolume),
    totalFees: lamportsToSol(pool.totalFees),
    totalTrades: Number(market.totalTrades.toString()),
    launchProtectionEndsAt: Number(pool.launchProtectionEndsAt.toString()),
    maxBuyDuringProtection: lamportsToSol(config.maxBuyDuringProtection),
    fees: {
      creator: lamportsToSol(new BN(market.creatorFeesEarned.toString())),
      curator: lamportsToSol(new BN(market.curatorFeesEarned.toString())),
      growth: lamportsToSol(new BN(market.growthFeesEarned.toString())),
      platform: lamportsToSol(new BN(market.platformFeesEarned.toString())),
      unclaimedCreator: lamportsToSol(pool.unclaimedCreatorFees),
      unclaimedCurator: lamportsToSol(pool.unclaimedCuratorFees),
      unclaimedGrowth: lamportsToSol(pool.unclaimedGrowthFees),
    },
  };
}

export async function quoteRedCircleTrade(
  protocolPostId: string,
  side: TradeSide,
  amount: number,
  slippageBps = DEFAULT_SLIPPAGE_BPS
): Promise<RedCircleQuote> {
  const client = getRedCircleClient();
  const addrs = client.derivePoolAddresses(protocolPostId);
  const [pool, market] = await Promise.all([
    client.fetchPool(protocolPostId),
    client.fetchMarketState(protocolPostId),
  ]);
  const model = parsePoolModel(pool.model);
  const status = parsePoolStatus(pool.status);
  const isBuy = side === "buy";
  const amountInRaw = isBuy ? solToLamports(amount) : tokensToRaw(amount);

  if (isBuy && status === "launchProtection") {
    const now = Math.floor(Date.now() / 1000);
    const launchProtectionEndsAt = Number(pool.launchProtectionEndsAt.toString());

    if (now < launchProtectionEndsAt) {
      const config = await client.fetchConfig();
      if (amountInRaw.gt(config.maxBuyDuringProtection)) {
        throw new Error(
          `Launch protection is active. Maximum buy is ${lamportsToSol(
            config.maxBuyDuringProtection
          )} SOL until ${new Date(launchProtectionEndsAt * 1000).toISOString()}.`
        );
      }
    }
  }

  let price: BN;
  let activeBin: PublicKey | null = null;
  let amountOutRaw: BN;

  if (model === "dlmm") {
    const bin = await client.fetchBin(addrs.pool, market.dlmm.activeBinId);
    activeBin = client.getBinPda(addrs.pool, market.dlmm.activeBinId);
    price = bin.priceLamportsPerToken;
    amountOutRaw = isBuy
      ? estimateDlmmBuyTokensOut(amountInRaw, price)
      : estimateDlmmSellSolOut(amountInRaw, price);
  } else {
    price = priceAtSupply(market.sigmoid, pool.tokensSold);
    amountOutRaw = isBuy
      ? estimateSigmoidBuyTokensOut(market.sigmoid, pool.tokensSold, amountInRaw)
      : estimateSigmoidSellSolOut(market.sigmoid, pool.tokensSold, amountInRaw);
  }

  const minimumAmountOutRaw = applySlippage(amountOutRaw, slippageBps);

  return {
    side,
    poolModel: model,
    amountInRaw: amountInRaw.toString(),
    amountOutRaw: amountOutRaw.toString(),
    minimumAmountOutRaw: minimumAmountOutRaw.toString(),
    amountIn: amount,
    amountOut: isBuy ? rawTokensToUi(amountOutRaw) : lamportsToSol(amountOutRaw),
    minimumAmountOut: isBuy ? rawTokensToUi(minimumAmountOutRaw) : lamportsToSol(minimumAmountOutRaw),
    priceLamportsPerToken: price.toString(),
    priceSolPerToken: lamportsToSol(price),
    slippageBps,
    activeBin: activeBin?.toBase58() ?? null,
    fees: feeBreakdownToSol(isBuy ? amountInRaw : amountOutRaw),
  };
}

export async function buildRedCircleTradeTransaction(params: {
  protocolPostId: string;
  user: PublicKey;
  curator: PublicKey;
  side: TradeSide;
  amount: number;
  slippageBps?: number;
}): Promise<{
  transaction: string;
  blockhash: string;
  lastValidBlockHeight: number;
  quote: RedCircleQuote;
  pool: string;
  tokenMint: string;
}> {
  const connection = getRedCircleConnection();
  const client = getRedCircleClient(connection);
  const quote = await quoteRedCircleTrade(
    params.protocolPostId,
    params.side,
    params.amount,
    params.slippageBps
  );
  const treasury = await getTreasury(client);
  const ix =
    params.side === "buy"
      ? await client.buy(
          {
            user: params.user,
            postId: params.protocolPostId,
            treasury,
            curator: params.curator,
            activeBin: quote.activeBin ? new PublicKey(quote.activeBin) : null,
          },
          {
            solAmount: new BN(quote.amountInRaw),
            minTokensOut: new BN(quote.minimumAmountOutRaw),
          }
        )
      : await client.sell(
          {
            user: params.user,
            postId: params.protocolPostId,
            treasury,
            curator: params.curator,
            activeBin: quote.activeBin ? new PublicKey(quote.activeBin) : null,
          },
          {
            tokenAmount: new BN(quote.amountInRaw),
            minSolOut: new BN(quote.minimumAmountOutRaw),
          }
        );

  const builtTx = await buildLegacyTransaction(connection, params.user, [ix], {
    computeUnitLimit: COMPUTE_UNIT_LIMIT,
  });

  return {
    transaction: builtTx.transaction
      .serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      })
      .toString("base64"),
    blockhash: builtTx.blockhash,
    lastValidBlockHeight: builtTx.lastValidBlockHeight,
    quote,
    pool: client.derivePoolAddresses(params.protocolPostId).pool.toBase58(),
    tokenMint: client.derivePoolAddresses(params.protocolPostId).tokenMint.toBase58(),
  };
}

export async function buildClaimGrowthFeesTransaction(params: {
  admin: PublicKey;
  protocolPostId: string;
  growthRecipient: PublicKey;
}) {
  const client = getRedCircleClient();
  const ix = await client.claimGrowthFees(
    params.admin,
    params.protocolPostId,
    params.growthRecipient
  );
  const tx = await client.buildTransaction(params.admin, [ix], {
    computeUnitLimit: COMPUTE_UNIT_LIMIT,
  });
  return Buffer.from(tx.serialize()).toString("base64");
}

export async function calculateRedCircleMarketCap(protocolPostId: string) {
  const client = getRedCircleClient();
  const [pool, market] = await Promise.all([
    client.fetchPool(protocolPostId),
    client.fetchMarketState(protocolPostId),
  ]);
  return lamportsToSol(calculateSigmoidMarketCap(market.sigmoid, pool.tokensSold));
}
