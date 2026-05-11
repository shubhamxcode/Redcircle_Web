import { and, asc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import * as schema from "../db";
import {
  getRedCirclePoolSummary,
  type RedCircleQuote,
  type TradeSide,
} from "./redcircle-protocol.service.js";

const { redCircleTrades, redCircleCandles } = schema;

export const CANDLE_TIMEFRAMES = ["1m", "5m", "15m", "1h", "1d"] as const;
export type CandleTimeframe = (typeof CANDLE_TIMEFRAMES)[number];

const TIMEFRAME_MS: Record<CandleTimeframe, number> = {
  "1m": 60_000,
  "5m": 5 * 60_000,
  "15m": 15 * 60_000,
  "1h": 60 * 60_000,
  "1d": 24 * 60 * 60_000,
};

function isCandleTimeframe(value: string): value is CandleTimeframe {
  return CANDLE_TIMEFRAMES.includes(value as CandleTimeframe);
}

function bucketTimestamp(date: Date, timeframe: CandleTimeframe) {
  return new Date(Math.floor(date.getTime() / TIMEFRAME_MS[timeframe]) * TIMEFRAME_MS[timeframe]);
}

async function upsertCandle(params: {
  postId: string;
  pool: string;
  timeframe: CandleTimeframe;
  timestamp: Date;
  price: number;
  volume: number;
}) {
  const [existing] = await db
    .select()
    .from(redCircleCandles)
    .where(
      and(
        eq(redCircleCandles.pool, params.pool),
        eq(redCircleCandles.timeframe, params.timeframe),
        eq(redCircleCandles.timestamp, params.timestamp)
      )
    )
    .limit(1);

  if (!existing) {
    await db.insert(redCircleCandles).values({
      postId: params.postId,
      pool: params.pool,
      timeframe: params.timeframe,
      timestamp: params.timestamp,
      open: params.price.toString(),
      high: params.price.toString(),
      low: params.price.toString(),
      close: params.price.toString(),
      volume: params.volume.toString(),
    });
    return;
  }

  await db
    .update(redCircleCandles)
    .set({
      high: Math.max(parseFloat(existing.high), params.price).toString(),
      low: Math.min(parseFloat(existing.low), params.price).toString(),
      close: params.price.toString(),
      volume: (parseFloat(existing.volume) + params.volume).toString(),
    })
    .where(eq(redCircleCandles.id, existing.id));
}

export async function recordConfirmedRedCircleTrade(params: {
  signature: string;
  postId: string;
  protocolPostId: string;
  side: TradeSide;
  quote: RedCircleQuote;
}) {
  const summary = await getRedCirclePoolSummary(params.protocolPostId);
  const timestamp = new Date();
  const volumeSol =
    params.side === "buy" ? params.quote.amountIn : params.quote.amountOut;
  const volumeLamports = Math.floor(volumeSol * 1_000_000_000).toString();

  await db
    .insert(redCircleTrades)
    .values({
      signature: params.signature,
      postId: params.postId,
      protocolPostId: params.protocolPostId,
      pool: summary.pool,
      timestamp,
      side: params.side,
      amountIn: params.quote.amountIn.toString(),
      amountOut: params.quote.amountOut.toString(),
      priceLamportsPerToken: params.quote.priceLamportsPerToken,
      volumeLamports,
      totalFee: params.quote.fees.total.toString(),
      creatorFee: params.quote.fees.creator.toString(),
      curatorFee: params.quote.fees.curator.toString(),
      platformFee: params.quote.fees.platform.toString(),
      growthFee: params.quote.fees.growth.toString(),
      tokensSold: summary.tokensSold.toString(),
      solReserve: summary.solReserve.toString(),
      tokenReserve: summary.tokenReserve.toString(),
    })
    .onConflictDoNothing();

  for (const timeframe of CANDLE_TIMEFRAMES) {
    await upsertCandle({
      postId: params.postId,
      pool: summary.pool,
      timeframe,
      timestamp: bucketTimestamp(timestamp, timeframe),
      price: params.quote.priceSolPerToken,
      volume: volumeSol,
    });
  }

  return summary;
}

export async function getRedCircleCandles(params: {
  postId: string;
  timeframe: string;
  since?: Date;
}) {
  const timeframe = isCandleTimeframe(params.timeframe) ? params.timeframe : "5m";
  const rows = await db
    .select({
      pool: redCircleCandles.pool,
      timeframe: redCircleCandles.timeframe,
      timestamp: redCircleCandles.timestamp,
      open: redCircleCandles.open,
      high: redCircleCandles.high,
      low: redCircleCandles.low,
      close: redCircleCandles.close,
      volume: redCircleCandles.volume,
    })
    .from(redCircleCandles)
    .where(
      params.since
        ? and(
            eq(redCircleCandles.postId, params.postId),
            eq(redCircleCandles.timeframe, timeframe),
            gte(redCircleCandles.timestamp, params.since)
          )
        : and(
            eq(redCircleCandles.postId, params.postId),
            eq(redCircleCandles.timeframe, timeframe)
          )
    )
    .orderBy(asc(redCircleCandles.timestamp));

  return rows.map((row) => ({
    pool: row.pool,
    timeframe: row.timeframe,
    timestamp: row.timestamp,
    open: parseFloat(row.open),
    high: parseFloat(row.high),
    low: parseFloat(row.low),
    close: parseFloat(row.close),
    volume: parseFloat(row.volume),
  }));
}

export async function getRedCircleTrades(postId: string) {
  return db
    .select()
    .from(redCircleTrades)
    .where(eq(redCircleTrades.postId, postId))
    .orderBy(sql`${redCircleTrades.timestamp} desc`);
}
