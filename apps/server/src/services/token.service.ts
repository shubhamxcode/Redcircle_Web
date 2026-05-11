import { PublicKey } from "@solana/web3.js";
import {
  createRedCirclePool,
  getRedCircleConnection,
  type CreateRedCirclePoolResult,
} from "./redcircle-protocol.service.js";

export type CreateTokenParams = {
  postId: string;
  tokenSymbol: string;
  tokenSupply: number;
  decimals: number;
  initialPriceSol: number;
  tokenName?: string;
  uri?: string;
};

export type TokenMintResult = {
  mintAddress: string;
  signature: string;
  decimals: number;
  explorerUrl: string;
  redCirclePoolAddress: string;
  redCircleMarketStateAddress: string;
  redCirclePoolSolVaultAddress: string;
  redCirclePoolTokenVaultAddress: string;
  redCircleConfigAddress: string;
};

export async function createPostToken(params: CreateTokenParams): Promise<TokenMintResult> {
  console.log("\n🪙 Creating RedCircle protocol pool...");
  console.log(`   Protocol Post ID: ${params.postId}`);
  console.log(`   Symbol: ${params.tokenSymbol}`);
  console.log(`   Supply: ${params.tokenSupply}`);
  console.log(`   Initial price: ${params.initialPriceSol} SOL`);

  const pool: CreateRedCirclePoolResult = await createRedCirclePool({
    postId: params.postId,
    tokenName: params.tokenName || `RedCircle ${params.tokenSymbol}`,
    tokenSymbol: params.tokenSymbol,
    tokenSupply: params.tokenSupply,
    initialPriceSol: params.initialPriceSol,
    uri: params.uri,
  });

  console.log("✅ RedCircle pool created");
  console.log(`   Mint: ${pool.mintAddress}`);
  console.log(`   Pool: ${pool.poolAddress}`);
  console.log(`   MarketState: ${pool.marketStateAddress}`);

  return {
    mintAddress: pool.mintAddress,
    signature: pool.signature,
    decimals: pool.decimals,
    explorerUrl: pool.explorerUrl,
    redCirclePoolAddress: pool.poolAddress,
    redCircleMarketStateAddress: pool.marketStateAddress,
    redCirclePoolSolVaultAddress: pool.poolSolVaultAddress,
    redCirclePoolTokenVaultAddress: pool.poolTokenVaultAddress,
    redCircleConfigAddress: pool.configAddress,
  };
}

export async function verifyTokenMint(mintAddress: string): Promise<boolean> {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const mintInfo = await getRedCircleConnection().getParsedAccountInfo(mintPublicKey);
    return mintInfo.value !== null;
  } catch (error) {
    console.error("Error verifying token mint:", error);
    return false;
  }
}

export async function getTokenSupply(mintAddress: string) {
  try {
    const mintPublicKey = new PublicKey(mintAddress);
    const supply = await getRedCircleConnection().getTokenSupply(mintPublicKey);
    return {
      amount: supply.value.amount,
      decimals: supply.value.decimals,
      uiAmount: supply.value.uiAmount,
    };
  } catch (error) {
    console.error("Error getting token supply:", error);
    return null;
  }
}
