// VORTEX — Feature Pipeline (Phase 1)
//
// Subscribes to CANDLE_CLOSE_1M events and recomputes all indicators
// from the closed candle buffer. Stores a FeatureSnapshot in memory.
// The enricher reads this snapshot on every tick — pure memory access, O(1).
//
// Design rules:
// - All indicator fields are null until sufficient candles exist (indicatorsWarm = false)
// - No fake values are ever emitted
// - Indicators are recomputed once per minute (on candle close), not per tick
// - volatilityLevel = ATR / price, normalised to 0-1 (clamped at 0.05 = extreme)
// - EMA200 warmth is tracked separately (needs 200 candles)
//
// AI / strategy layers MUST read from getSnapshot(), not recompute on their own.

import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { getCandles1m } from '../ingestion/candles/candleAggregator';
import { computeEMA } from './indicators/ema';
import { computeATR } from './indicators/atr';
import { computeRSI } from './indicators/rsi';
import { computeADX } from './indicators/adx';
import { logger } from '../utils/logger';

export interface FeatureSnapshot {
  timestamp: string;           // ISO timestamp of last closed 1m candle
  candleCount: number;         // number of 1m closed candles in buffer
  indicatorsWarm: boolean;     // true when primary indicators (EMA20, ATR14, RSI14) are valid

  // Price EMAs (null until warm)
  ema20:  number | null;
  ema50:  number | null;
  ema200: number | null;

  // Volatility / momentum (null until warm)
  atr14: number | null;
  rsi14: number | null;

  // Trend strength (null until warm — needs ~28 candles)
  adx14:   number | null;
  plusDI:  number | null;
  minusDI: number | null;

  // Derived
  volatilityLevel: number | null;  // ATR / lastClose, clamped 0-1
  lastClose: number | null;
}

// Minimum candles for primary indicators to be valid
const WARM_THRESHOLD = 50; // covers EMA20, ATR14, RSI14, ADX14 (28 min)
const VOLATILITY_CLAMP = 0.05; // ATR/price above this is treated as max volatility

let snapshot: FeatureSnapshot = {
  timestamp: '',
  candleCount: 0,
  indicatorsWarm: false,
  ema20: null, ema50: null, ema200: null,
  atr14: null, rsi14: null,
  adx14: null, plusDI: null, minusDI: null,
  volatilityLevel: null,
  lastClose: null,
};

function recompute(): void {
  const candles = getCandles1m();
  const count = candles.length;

  if (count === 0) return;

  const closes = candles.map(c => c.close);
  const lastClose = closes[closes.length - 1];
  const lastCandle = candles[candles.length - 1];

  const ema20  = computeEMA(closes, 20);
  const ema50  = computeEMA(closes, 50);
  const ema200 = computeEMA(closes, 200);
  const atr14  = computeATR(candles, 14);
  const rsi14  = computeRSI(candles, 14);
  const { adx: adx14, plusDI, minusDI } = computeADX(candles, 14);

  const indicatorsWarm = count >= WARM_THRESHOLD && ema20 !== null && atr14 !== null && rsi14 !== null;

  let volatilityLevel: number | null = null;
  if (atr14 !== null && lastClose > 0) {
    volatilityLevel = Number(Math.min(atr14 / lastClose / VOLATILITY_CLAMP, 1).toFixed(4));
  }

  snapshot = {
    timestamp: new Date(lastCandle.closeTime).toISOString(),
    candleCount: count,
    indicatorsWarm,
    ema20, ema50, ema200,
    atr14, rsi14,
    adx14, plusDI, minusDI,
    volatilityLevel,
    lastClose,
  };

  if (indicatorsWarm && count % 10 === 0) {
    // Log every 10 candles when warm — not every minute, just periodic health check
    logger.debug('featurePipeline', 'Indicator snapshot updated', {
      candles: count, ema20, atr14, rsi14, adx14, volatilityLevel,
    });
  }

  if (!snapshot.indicatorsWarm && count > 0 && count % 5 === 0) {
    logger.info('featurePipeline', `Warming up — ${count} candles, need ${WARM_THRESHOLD}`);
  }

  if (indicatorsWarm && count === WARM_THRESHOLD) {
    logger.info('featurePipeline', 'Indicators warm — regime detection now active', {
      ema20, ema50, atr14, rsi14, adx14,
    });
  }
}

export function getSnapshot(): FeatureSnapshot {
  return snapshot;
}

export function startFeaturePipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.CANDLE_CLOSE_1M, _envelope => {
    try {
      recompute();
    } catch (e) {
      logger.error('featurePipeline', 'Error recomputing indicators', { err: String(e) });
    }
  });

  logger.info('featurePipeline', 'Feature pipeline started — waiting for candle closes');

  // Run once immediately in case candles were already seeded before pipelines started
  try { recompute(); } catch {}
}
