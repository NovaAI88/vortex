// VORTEX — Trend Strategy (Phase 3)
//
// Trend-following strategy for TREND regime.
// Entry logic: EMA20 pullback with full EMA stack alignment + ADX confirmation.
//
// Signal conditions (all must pass):
//   - adx14 >= 25
//   - EMA stack aligned: ema20/ema50/ema200 fully ordered (or partial if ema200 not warm)
//   - RSI not overextended: LONG → rsi14 < 75 | SHORT → rsi14 > 25
//   - Pullback window: price within 0.3%–2.5% of ema20 (EMA retest zone)
//
// Signal type:
//   - "buy"  when bias is LONG and pullback to EMA20 from above
//   - "sell" when bias is SHORT and rally to EMA20 from below
//   - null   when conditions not met
//
// AI boundary: read-only. No imports from execution, risk, operator, portfolio.

import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';
import { AIAnalysis } from '../aiAnalysisEngine';

// ─── Thresholds (live defaults) ──────────────────────────────────────────────

const ADX_MIN         = 25;
const RSI_LONG_MAX    = 75;    // don't buy into overbought
const RSI_SHORT_MIN   = 25;    // don't sell into oversold
const PULLBACK_MIN    = 0.003; // 0.3% — price must have pulled back at least this far
const PULLBACK_MAX    = 0.025; // 2.5% — beyond this is a breakdown, not a pullback

// ─── Optional param overrides (optimizer only) ───────────────────────────────
// Live pipeline never passes this argument. Defaults to module constants.

export interface TrendSignalParams {
  adxMin?:      number;
  pullbackMin?: number;
  pullbackMax?: number;
  rsiLongMax?:  number;
  rsiShortMin?: number;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateTrendSignal(
  state:    ProcessedMarketState,
  analysis: AIAnalysis,
  params?:  TrendSignalParams,
): TradeSignal | null {
  const price  = state.price;
  const adx14  = state.adx14  ?? null;
  const rsi14  = state.rsi14  ?? null;
  const ema20  = state.ema20  ?? null;
  const ema50  = state.ema50  ?? null;
  const ema200 = state.ema200 ?? null;
  const bias   = analysis.bias;

  // Resolve thresholds — params override defaults; live path never provides params
  const adxMin      = params?.adxMin      ?? ADX_MIN;
  const pullbackMin = params?.pullbackMin ?? PULLBACK_MIN;
  const pullbackMax = params?.pullbackMax ?? PULLBACK_MAX;
  const rsiLongMax  = params?.rsiLongMax  ?? RSI_LONG_MAX;
  const rsiShortMin = params?.rsiShortMin ?? RSI_SHORT_MIN;

  // ── Guard: indicators must be warm ──────────────────────────────────────
  if (!state.indicatorsWarm) return null;

  // ── Guard: must have minimum indicators ─────────────────────────────────
  if (adx14 === null || ema20 === null) return null;

  // ── Guard: ADX must confirm trend strength ───────────────────────────────
  if (adx14 < adxMin) return null;

  // ── Guard: bias must be directional ─────────────────────────────────────
  if (bias === 'NEUTRAL') return null;

  // ── Guard: EMA stack alignment ──────────────────────────────────────────
  if (bias === 'LONG') {
    const fullStack    = ema50 !== null && ema200 !== null && ema20 > ema50 && ema50 > ema200;
    const partialStack = ema50 !== null && ema200 === null && ema20 > ema50;
    if (!fullStack && !partialStack) return null;
  } else {
    // SHORT
    const fullStack    = ema50 !== null && ema200 !== null && ema20 < ema50 && ema50 < ema200;
    const partialStack = ema50 !== null && ema200 === null && ema20 < ema50;
    if (!fullStack && !partialStack) return null;
  }

  // ── Guard: RSI not overextended ──────────────────────────────────────────
  if (rsi14 !== null) {
    if (bias === 'LONG'  && rsi14 >= rsiLongMax)  return null;
    if (bias === 'SHORT' && rsi14 <= rsiShortMin) return null;
  }

  // ── Guard: price in EMA20 pullback window ────────────────────────────────
  const distFromEma20 = Math.abs(price - ema20) / price;
  if (distFromEma20 < pullbackMin || distFromEma20 > pullbackMax) return null;

  // ── Confirm pullback direction ───────────────────────────────────────────
  // LONG: price pulled back toward EMA20 from above — price should be below ema20 or just touching
  // SHORT: price rallied toward EMA20 from below
  if (bias === 'LONG'  && price > ema20 * (1 + pullbackMin)) return null; // price too far above — not a pullback
  if (bias === 'SHORT' && price < ema20 * (1 - pullbackMin)) return null; // price too far below — not a rally

  // ── Signal ───────────────────────────────────────────────────────────────
  const signalType = bias === 'LONG' ? 'buy' : 'sell';

  return {
    source:     'regime-strategy-router',
    symbol:     state.symbol,
    signalType,
    confidence: analysis.confidence,
    rationale:  `TREND/${bias}: EMA20 pullback, ADX=${adx14.toFixed(1)}, dist=${(distFromEma20 * 100).toFixed(2)}%${rsi14 !== null ? `, RSI=${rsi14.toFixed(1)}` : ''}`,
    timestamp:  new Date().toISOString(),
    strategyId: 'regime-trend',
    variantId:  'trend-v1',
    baseState:  state,
  };
}
