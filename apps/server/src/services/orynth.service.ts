import { Transaction, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import crypto from "node:crypto";

const BASE_URL = process.env.ORYNTH_API_BASE_URL ?? "https://orynth.dev";
const API_KEY  = process.env.ORYNTH_PARTNER_API_KEY ?? "";

// ─── Types matching Orynth API contracts ─────────────────────────────────────

export interface PrepareRequest {
  externalId: string;
  payerWalletAddress: string;
  source: {
    platform: string;
    url: string;
    id: string;
    type: string;
  };
  creator: {
    platform: string;
    username: string;
    platformUserId: string;
    profileUrl: string;
  };
  name: string;
  symbol: string;
  description: string;
  imageUrl: string;
  websiteUrl?: string;
}

export type LaunchStatus = "prepared" | "submitted" | "launched" | "failed";

export interface FeeConfig {
  totalTradingFeeBps: number;       // 250
  orynthFeeBps: number;             // 116
  partnerFeeBps: number;            // 134
  partnerBucketIncludesCreatorPayouts: boolean;
  suggestedPartnerShareBps: number; // 67
  suggestedCreatorShareBps: number; // 67
  onChain?: {
    meteoraProtocolFeeBps: number;
    orynthFeeClaimerBps: number;
    partnerPoolCreatorFeeBps: number;
    creatorTradingFeePercentage: number;
  };
}

export interface PrepareResponse {
  success: boolean;
  launch: {
    id: string;
    status: LaunchStatus;
    preparedTxHex: string;
    requiredSigners: string[];        // ["payer", "poolCreator"]
    feeConfig: FeeConfig;
  };
}

export interface StatusResponse {
  success: boolean;
  launch: {
    id: string;
    status: LaunchStatus;
    mintAddress?: string;
    poolAddress?: string;
    launchSignature?: string;
    feeConfig?: FeeConfig;
    source?: Record<string, unknown>;
    creator?: Record<string, unknown>;
  };
}

// ─── HTTP client ─────────────────────────────────────────────────────────────

async function orynthFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    },
  });

  const data = await res.json() as Record<string, unknown>;
  if (!res.ok) {
    console.error(`❌ [Orynth] ${path} → ${res.status}`);
    console.error(`❌ [Orynth] error:`, data.error);
    console.error(`❌ [Orynth] details:`, JSON.stringify(data.details, null, 2));
    let msg = (data.message ?? data.error ?? `Orynth API ${res.status}`) as string;
    if (typeof msg === "string" && msg.toLowerCase().includes("payer needs at least")) {
      const match = msg.match(/([\d.]+)\s*SOL/i);
      const sol = match ? parseFloat(match[1]!).toFixed(2) : "0.05";
      msg = `You need at least ${sol} SOL to cover this launch`;
    }
    const err = new Error(msg) as Error & { orynthDetails?: unknown };
    err.orynthDetails = data.details;
    throw err;
  }
  return data as T;
}

// ─── Quote ───────────────────────────────────────────────────────────────────
// GET /api/v1/launches/quote

export interface QuoteResponse {
  partner: {
    id: string;
    name: string;
    slug: string;
    poolCreatorWalletAddress: string;
    claimReceiverWalletAddress: string;
  };
  launchCost: {
    requiredSol: number;
    uploadPriceSol: number;
    transactionFeeBufferSol: number;
  };
  fees: FeeConfig & {
    totalTradingFeePercentage: number;
    orynthFeePercentage: number;
    partnerFeePercentage: number;
    suggestedPartnerSharePercentage: number;
    suggestedCreatorSharePercentage: number;
  };
  requiredSigners: {
    payer: string;
    poolCreator: string;
  };
}

export async function getQuote(): Promise<QuoteResponse> {
  return orynthFetch<QuoteResponse>("/api/v1/launches/quote");
}

// ─── Prepare ─────────────────────────────────────────────────────────────────
// POST /api/v1/launches/prepare

export async function prepareLaunch(req: PrepareRequest): Promise<PrepareResponse> {
  return orynthFetch<PrepareResponse>("/api/v1/launches/prepare", {
    method: "POST",
    body: JSON.stringify(req),
  });
}

// ─── Sign as poolCreator ─────────────────────────────────────────────────────
export function signAsPoolCreator(preparedTxHex: string): string {
  const privKeyB58 = process.env.ORYNTH_POOL_CREATOR_WALLET;
  if (!privKeyB58) throw new Error("ORYNTH_POOL_CREATOR_WALLET not configured");

  const keypair = Keypair.fromSecretKey(bs58.decode(privKeyB58));
  const tx = Transaction.from(Buffer.from(preparedTxHex, "hex"));
  tx.partialSign(keypair);

  return tx.serialize({ requireAllSignatures: false }).toString("hex");
}

// ─── Sign as payer (Redcircle server wallet) ─────────────────────────────────
export function signAsPayer(txHex: string): string {
  const privKeyB58 = process.env.REDCIRCLE_PAYER_WALLET;
  if (!privKeyB58) throw new Error("REDCIRCLE_PAYER_WALLET not configured");

  const keypair = Keypair.fromSecretKey(bs58.decode(privKeyB58));
  const tx = Transaction.from(Buffer.from(txHex, "hex"));
  tx.partialSign(keypair);

  return tx.serialize({ requireAllSignatures: false }).toString("hex");
}

export function getPayerPublicKey(): string {
  const privKeyB58 = process.env.REDCIRCLE_PAYER_WALLET;
  if (!privKeyB58) throw new Error("REDCIRCLE_PAYER_WALLET not configured");
  return Keypair.fromSecretKey(bs58.decode(privKeyB58)).publicKey.toBase58();
}

// ─── Submit ──────────────────────────────────────────────────────────────────
// POST /api/v1/launches/submit

export async function submitLaunch(launchId: string, signedTxHex: string) {
  return orynthFetch<{ success: boolean }>("/api/v1/launches/submit", {
    method: "POST",
    body: JSON.stringify({ launchId, signedTxHex }),
  });
}

// ─── Status ──────────────────────────────────────────────────────────────────
// GET /api/v1/launches/{launchId}

export async function getLaunchStatus(orynthLaunchId: string): Promise<StatusResponse> {
  return orynthFetch<StatusResponse>(`/api/v1/launches/${orynthLaunchId}`);
}

// ─── Earnings ─────────────────────────────────────────────────────────────────
// GET /api/v1/earnings?poolAddress=A&poolAddress=B

export interface PoolEarning {
  launchId?: string;
  externalId?: string;
  poolAddress: string;
  mintAddress?: string;
  symbol?: string;
  name?: string;
  poolCreatorWalletAddress?: string;
  claimableLamports: string;
  claimedLamports: string;
  totalLamports: string;
  claimableUsdc: string;
  claimedUsdc: string;
  totalUsdc: string;
  isMigrated: boolean;
  supported: boolean;
}

export interface EarningsResponse {
  success: boolean;
  earnings: PoolEarning[];
  totalAmountSol: string;
}

export async function getEarnings(poolAddresses: string[]): Promise<EarningsResponse> {
  const qs = poolAddresses.map((a) => `poolAddress=${encodeURIComponent(a)}`).join("&");
  return orynthFetch<EarningsResponse>(`/api/v1/earnings?${qs}`);
}

// ─── Earnings claim ───────────────────────────────────────────────────────────
// Flow:
// 1. POST /api/v1/earnings/claim/prepare  → claimBatchId + txHex per pool
// 2. Sign each txHex with ORYNTH_POOL_CREATOR_WALLET (poolCreator signer, server-side only)
//    claimReceiverWalletAddress does NOT sign — USDC is sent there automatically
// 3. POST /api/v1/earnings/claim/submit   → broadcasts signed txs

export interface ClaimTransaction {
  poolAddress: string;
  launchId?: string;
  claimableLamports: string;
  claimableUsdc: string;
  txHex: string;
  requiredSigner: string;
  receiverWalletAddress: string;
  blockhash: string;
  lastValidBlockHeight: number;
}

export interface ClaimPrepareResponse {
  success: boolean;
  claimBatchId: string;
  transactions: ClaimTransaction[];
  skipped: { poolAddress: string; reason: string }[];
}

export interface ClaimSubmitResult {
  poolAddress: string;
  success: boolean;
  signature?: string;
  error?: string;
  status?: string;
}

export interface ClaimSubmitResponse {
  success: boolean;
  claimBatchId?: string;
  results?: ClaimSubmitResult[];
}

export async function prepareEarningsClaim(poolAddresses: string[]): Promise<ClaimPrepareResponse> {
  return orynthFetch<ClaimPrepareResponse>("/api/v1/earnings/claim/prepare", {
    method: "POST",
    body: JSON.stringify({ poolAddresses }),
  });
}

export async function submitEarningsClaim(
  claimBatchId: string,
  signedTransactions: { poolAddress: string; signedTxHex: string }[],
): Promise<ClaimSubmitResponse> {
  return orynthFetch<ClaimSubmitResponse>("/api/v1/earnings/claim/submit", {
    method: "POST",
    body: JSON.stringify({ claimBatchId, signedTransactions }),
  });
}

// Signs a claim tx with ORYNTH_POOL_CREATOR_WALLET (same signer used for launches).
// claimReceiverWalletAddress (ORYNTH_CLAIM_RECEIVER_WALLET) does not sign —
// Orynth sends USDC directly to it as configured in the partner setup.
export function signClaimTx(preparedTxHex: string): string {
  const privKeyB58 = process.env.ORYNTH_POOL_CREATOR_WALLET;
  if (!privKeyB58) throw new Error("ORYNTH_POOL_CREATOR_WALLET not configured");

  const keypair = Keypair.fromSecretKey(bs58.decode(privKeyB58));
  const tx = Transaction.from(Buffer.from(preparedTxHex, "hex"));
  tx.partialSign(keypair);
  return tx.serialize({ requireAllSignatures: false }).toString("hex");
}

// ─── Webhook signature verification ──────────────────────────────────────────

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.ORYNTH_WEBHOOK_SECRET;
  if (!secret) return false;

  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}
