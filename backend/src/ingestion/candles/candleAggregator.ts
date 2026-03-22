// VORTEX — Candle Aggregator (Phase 1)
//
// Aggregates the live tick stream into OHLCV candles.
// Produces 1m candles in real-time; derives 5m and 15m by grouping.
//
// Design:
// - Candle boundary = floor(tickTimestampMs / intervalMs)
// - When boundary changes, the previous candle is "closed" and emitted
// - Maintains rolling buffers: 500 × 1m, 200 × 5m, 200 × 15m
// - Does NOT poll REST — tick aggregation only (seeder handles startup history)
// - BTCUSDT only (Phase 1 scope)
//
// No external dependencies. No disk I/O. Pure in-memory.

import { EventBus } from '../../events/eventBus';
import { EVENT_TOPICS } from '../../events/topics';

export interface OHLCVCandle {
  symbol: string;
  interval: '1m' | '5m' | '15m';
  openTime: number;    // ms epoch
  closeTime: number;   // ms epoch (openTime + intervalMs - 1)
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  trades: number;
  closed: boolean;
}

const INTERVAL_1M_MS  = 60_000;
const INTERVAL_5M_MS  = 5 * 60_000;
const INTERVAL_15M_MS = 15 * 60_000;
const MAX_1M_CANDLES  = 500;
const MAX_5M_CANDLES  = 200;
const MAX_15M_CANDLES = 200;

// Rolling candle buffers — newest candle at the end
const candles1m:  OHLCVCandle[] = [];
const candles5m:  OHLCVCandle[] = [];
const candles15m: OHLCVCandle[] = [];

// Current open (building) candles
let open1m:  OHLCVCandle | null = null;
let open5m:  OHLCVCandle | null = null;
let open15m: OHLCVCandle | null = null;

let bus: EventBus | null = null;

function bucketStart(tsMs: number, intervalMs: number): number {
  return Math.floor(tsMs / intervalMs) * intervalMs;
}

function newCandle(symbol: string, interval: OHLCVCandle['interval'], openTime: number, intervalMs: number, price: number, volume: number): OHLCVCandle {
  return {
    symbol,
    interval,
    openTime,
    closeTime: openTime + intervalMs - 1,
    open: price,
    high: price,
    low: price,
    close: price,
    volume,
    trades: 1,
    closed: false,
  };
}

function updateCandle(candle: OHLCVCandle, price: number, volume: number): void {
  if (price > candle.high) candle.high = price;
  if (price < candle.low)  candle.low  = price;
  candle.close = price;
  candle.volume += volume;
  candle.trades++;
}

function closeAndBuffer(candle: OHLCVCandle, buffer: OHLCVCandle[], maxLen: number): OHLCVCandle {
  candle.closed = true;
  buffer.push({ ...candle }); // push a copy
  while (buffer.length > maxLen) buffer.shift();
  return candle;
}

function publishCandle(candle: OHLCVCandle, topic: string): void {
  if (!bus) return;
  try {
    bus.publish(topic, { ...candle }, 'candle-aggregator');
  } catch {}
}

// Seed pre-computed candles from the REST seeder into the buffers.
// Called once on startup with historical data.
export function seedCandles(historical: { '1m': OHLCVCandle[]; '5m': OHLCVCandle[]; '15m': OHLCVCandle[] }): void {
  // Replace buffer contents; seed data is oldest-first
  candles1m.length  = 0;
  candles5m.length  = 0;
  candles15m.length = 0;

  for (const c of historical['1m'].slice(-MAX_1M_CANDLES)) {
    candles1m.push({ ...c, closed: true });
  }
  for (const c of historical['5m'].slice(-MAX_5M_CANDLES)) {
    candles5m.push({ ...c, closed: true });
  }
  for (const c of historical['15m'].slice(-MAX_15M_CANDLES)) {
    candles15m.push({ ...c, closed: true });
  }
}

// Process a single tick. Called by the processing pipeline on each MarketEvent.
export function processTick(symbol: string, price: number, volume: number, timestampMs: number): void {
  if (symbol !== 'BTCUSDT') return;

  // --- 1m candle ---
  const bucket1m = bucketStart(timestampMs, INTERVAL_1M_MS);

  if (!open1m) {
    open1m = newCandle(symbol, '1m', bucket1m, INTERVAL_1M_MS, price, volume);
  } else if (bucket1m > open1m.openTime) {
    // Candle closed — commit and start new
    const closed = closeAndBuffer(open1m, candles1m, MAX_1M_CANDLES);
    publishCandle(closed, EVENT_TOPICS.CANDLE_CLOSE_1M);
    open1m = newCandle(symbol, '1m', bucket1m, INTERVAL_1M_MS, price, volume);
  } else {
    updateCandle(open1m, price, volume);
  }

  // --- 5m candle ---
  const bucket5m = bucketStart(timestampMs, INTERVAL_5M_MS);

  if (!open5m) {
    open5m = newCandle(symbol, '5m', bucket5m, INTERVAL_5M_MS, price, volume);
  } else if (bucket5m > open5m.openTime) {
    const closed = closeAndBuffer(open5m, candles5m, MAX_5M_CANDLES);
    publishCandle(closed, EVENT_TOPICS.CANDLE_CLOSE_5M);
    open5m = newCandle(symbol, '5m', bucket5m, INTERVAL_5M_MS, price, volume);
  } else {
    updateCandle(open5m, price, volume);
  }

  // --- 15m candle ---
  const bucket15m = bucketStart(timestampMs, INTERVAL_15M_MS);

  if (!open15m) {
    open15m = newCandle(symbol, '15m', bucket15m, INTERVAL_15M_MS, price, volume);
  } else if (bucket15m > open15m.openTime) {
    const closed = closeAndBuffer(open15m, candles15m, MAX_15M_CANDLES);
    publishCandle(closed, EVENT_TOPICS.CANDLE_CLOSE_15M);
    open15m = newCandle(symbol, '15m', bucket15m, INTERVAL_15M_MS, price, volume);
  } else {
    updateCandle(open15m, price, volume);
  }
}

export function startCandleAggregator(eventBus: EventBus): void {
  bus = eventBus;
}

// Accessors for downstream modules (feature pipeline, enricher)
export function getCandles1m():  OHLCVCandle[] { return candles1m; }
export function getCandles5m():  OHLCVCandle[] { return candles5m; }
export function getCandles15m(): OHLCVCandle[] { return candles15m; }

export function getOpenCandle1m():  OHLCVCandle | null { return open1m; }

export function getCandleCount(): { '1m': number; '5m': number; '15m': number } {
  return { '1m': candles1m.length, '5m': candles5m.length, '15m': candles15m.length };
}

// Returns true when enough 1m candles exist for ATR(14) and RSI(14) computation
export function isWarm(): boolean {
  return candles1m.length >= 14;
}
