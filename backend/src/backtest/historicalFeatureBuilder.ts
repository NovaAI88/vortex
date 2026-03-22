// VORTEX — Historical Feature Builder (Phase 5)
//
// Converts a raw OHLCVCandle array into a ProcessedMarketState[] for backtest replay.
//
// ── Determinism & leak-free guarantee (FULL-RECOMPUTE strategy) ────────────
//
// Strategy: FULL-RECOMPUTE per candle index.
//
// For each candle at index i, all indicators are computed using only
// candles[0..i] (inclusive). No candle at index > i is ever read.
//
// This is more expensive than an incremental approach (O(n²) for the series)
// but eliminates any risk of lookahead bias. For the backtest candle counts
// supported (200–1000), this is well within acceptable runtime (<1s).
//
// If performance becomes a concern at large limits (>5000), this can be
// upgraded to an incremental EMA/ATR/ADX approach — but only after the
// correct baseline is established here.
//
// ── What it produces ───────────────────────────────────────────────────────
//
// Each ProcessedMarketState has:
//   - price = candle close (for signal generation)
//   - candleHigh / candleLow (for TP/stop breach detection in simulator)
//   - all indicators computed from candles[0..i]
//   - indicatorsWarm = true when all primary indicators are non-null
//   - newsRiskFlag = false (no live news feed in backtest — conservative)

import { OHLCVCandle } from '../ingestion/candles/candleAggregator';
import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { computeEMA } from '../processing/indicators/ema';
import { computeATR } from '../processing/indicators/atr';
import { computeRSI } from '../processing/indicators/rsi';
import { computeADX } from '../processing/indicators/adx';

// ── Phase 7A diagnostic extensions ──────────────────────────────────────────
// These fields are attached to each replay state for entry-quality analysis.
// They are NEVER used by live strategy logic — only by diagnostic code paths.

export interface ReplayStateExtensions {
  ema20Slope:   number | null;  // EMA20[i] − EMA20[i−3], raw price units (positive = rising)
  recentHigh20: number | null;  // highest candle high over last 20 closed candles (inclusive)
  recentLow20:  number | null;  // lowest candle low  over last 20 closed candles (inclusive)
}

// Map from candle index → diagnostic extension. Populated by buildReplayStates().
export type ReplayExtensionMap = Map<number, ReplayStateExtensions>;

// Minimum candles before primary indicators (EMA20, ATR14, RSI14) are valid.
// Matches the live featurePipeline's WARM_THRESHOLD = 50.
const WARM_THRESHOLD    = 50;
const VOLATILITY_CLAMP  = 0.05;  // ATR/price clamped at 5% = max volatility = 1.0

/**
 * Build a full replay state array from raw OHLCV candles.
 * Also returns a ReplayExtensionMap containing diagnostic fields (EMA20 slope,
 * recent 20-candle high/low) keyed by candle index.
 *
 * @param candles  Candles in chronological order (oldest first).
 * @returns        { states, extensions }
 */
export function buildReplayStates(candles: OHLCVCandle[]): ProcessedMarketState[];
export function buildReplayStates(
  candles:    OHLCVCandle[],
  withExtensions: true,
): { states: ProcessedMarketState[]; extensions: ReplayExtensionMap };
export function buildReplayStates(
  candles:         OHLCVCandle[],
  withExtensions?: boolean,
): ProcessedMarketState[] | { states: ProcessedMarketState[]; extensions: ReplayExtensionMap } {
  const states:     ProcessedMarketState[]           = [];
  const extensions: ReplayExtensionMap               = new Map();

  // Pre-compute EMA20 at each index for slope calculation.
  // We do a single pass here to avoid O(n²) EMA recomputation for slope.
  // EMA20 is already full-recomputed per state; store the sequence cheaply.
  const ema20Series: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    // Slice available candles: index 0 through i (inclusive)
    const available = candles.slice(0, i + 1);
    const current   = candles[i];

    const closes = available.map(c => c.close);
    const price  = current.close;

    // Compute indicators from available candles only
    const ema20  = computeEMA(closes, 20);
    const ema50  = computeEMA(closes, 50);
    const ema200 = computeEMA(closes, 200);
    const atr14  = computeATR(available, 14);
    const rsi14  = computeRSI(available, 14);
    const { adx: adx14 } = computeADX(available, 14);

    // Warm flag: matches live pipeline — need 50 candles + primary indicators
    const indicatorsWarm = (
      available.length >= WARM_THRESHOLD &&
      ema20  !== null &&
      atr14  !== null &&
      rsi14  !== null
    );

    // Volatility level: normalised ATR/price, clamped 0–1
    let volatilityLevel: number | null = null;
    if (atr14 !== null && price > 0) {
      volatilityLevel = Number(Math.min(atr14 / price / VOLATILITY_CLAMP, 1).toFixed(4));
    }

    const state: ProcessedMarketState = {
      // Core
      exchange:  'BINANCE',
      symbol:    current.symbol || 'BTCUSDT',
      eventType: 'candle',
      price,
      volume:    current.volume,
      timestamp: new Date(current.closeTime).toISOString(),
      enriched:  true,
      baseEvent: {} as any,

      // Legacy compat
      movingAvg: ema20 ?? undefined,

      // Candle OHLCV (used by simulator for TP/stop breach checks)
      candleTs:     new Date(current.closeTime).toISOString(),
      candleOpen:   current.open,
      candleHigh:   current.high,
      candleLow:    current.low,
      candleClose:  current.close,
      candleVolume: current.volume,
      indicatorsWarm,

      // Indicators
      ema20,
      ema50,
      ema200,
      atr14,
      rsi14,
      adx14,
      volatilityLevel,

      // News risk: always false in backtest (no live news feed)
      newsRiskFlag: false,
    };

    states.push(state);
    ema20Series.push(ema20);

    // ── Phase 7A: diagnostic extensions ────────────────────────────────────
    if (withExtensions) {
      // EMA20 slope: EMA20[i] − EMA20[i−3] (null if not enough history)
      const slopeLookback = 3;
      const prevEma20 = i >= slopeLookback ? ema20Series[i - slopeLookback] : null;
      const ema20Slope = (ema20 !== null && prevEma20 !== null)
        ? Number((ema20 - prevEma20).toFixed(4))
        : null;

      // Recent 20-candle high/low: uses candles[max(0, i-19)..i] (inclusive, leak-free)
      const windowStart  = Math.max(0, i - 19);
      const windowCandles = candles.slice(windowStart, i + 1);
      const recentHigh20 = windowCandles.length > 0
        ? Math.max(...windowCandles.map(c => c.high))
        : null;
      const recentLow20 = windowCandles.length > 0
        ? Math.min(...windowCandles.map(c => c.low))
        : null;

      extensions.set(i, { ema20Slope, recentHigh20, recentLow20 });
    }
  }

  if (withExtensions) {
    return { states, extensions };
  }
  return states;
}
