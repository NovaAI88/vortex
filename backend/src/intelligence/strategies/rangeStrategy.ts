// VORTEX — Range Strategy (Phase 3)
//
// Mean-reversion strategy for RANGE regime.
// Entry logic: RSI extremes with breakout rejection.
//
// Signal conditions (all must pass):
//   - adx14 < 25
//   - RSI extreme: rsi14 <= 35 (oversold → buy) or rsi14 >= 65 (overbought → sell)
//   - No breakout: price must be within 1.5% of ema20 (or ema50 if available)
//   - newsRiskFlag must be false
//
// Signal type:
//   - "buy"  when rsi14 <= 35 (mean-reversion from oversold)
//   - "sell" when rsi14 >= 65 (mean-reversion from overbought)
//   - null   when conditions not met
//
// Confidence: uses AIAnalysis.confidence (already accounts for ADX weakness)
//
// AI boundary: read-only. No imports from execution, risk, operator, portfolio.

import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';
import { AIAnalysis } from '../aiAnalysisEngine';

// ─── Thresholds (live defaults) ──────────────────────────────────────────────

const ADX_MAX           = 25;    // regime gate — redundant safety check
const RSI_OVERSOLD      = 35;    // buy zone
const RSI_OVERBOUGHT    = 65;    // sell zone
const BREAKOUT_MARGIN   = 0.015; // 1.5% — beyond this = breakout, reject
const MAX_REGIME_AGE    = 20;    // Phase 7B: suppress RANGE signals after this many candles in regime

// ─── Optional param overrides (optimizer only) ───────────────────────────────
// Live pipeline never passes this argument. Defaults to module constants.

export interface RangeSignalParams {
  rsiOversold?:            number;
  rsiOverbought?:          number;
  breakoutMargin?:         number;
  // Phase 7B: entry-quality filters (passed from router context, not from strategy state)
  maxRegimeAge?:           number;   // suppress signal if regimeAge > this; default: MAX_REGIME_AGE (20)
  rangeLocationThreshold?: number;   // 0–1; longs blocked above, shorts blocked below; default: no gate
}

// ─── Router context (Phase 7B) ───────────────────────────────────────────────
// Carries live fields computed by the router layer (not by strategies).
// Strategies receive this as a read-only snapshot — no strategy owns this state.

export interface RangeRouterContext {
  regimeAge:     number;         // candles elapsed in current RANGE regime
  rangeLocation: number | null;  // (price − low20) / (high20 − low20); null if window not ready
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateRangeSignal(
  state:    ProcessedMarketState,
  analysis: AIAnalysis,
  params?:  RangeSignalParams,
  ctx?:     RangeRouterContext,  // Phase 7B: router-owned context; strategy is read-only
): TradeSignal | null {
  const price         = state.price;
  const adx14         = state.adx14  ?? null;
  const rsi14         = state.rsi14  ?? null;
  const ema20         = state.ema20  ?? null;
  const ema50         = state.ema50  ?? null;
  const newsRiskFlag  = state.newsRiskFlag ?? false;

  // Resolve thresholds — params override defaults; live path never provides params
  const rsiOversold    = params?.rsiOversold    ?? RSI_OVERSOLD;
  const rsiOverbought  = params?.rsiOverbought  ?? RSI_OVERBOUGHT;
  const breakoutMargin = params?.breakoutMargin ?? BREAKOUT_MARGIN;

  // ── Guard: indicators must be warm ──────────────────────────────────────
  if (!state.indicatorsWarm) return null;

  // ── Guard: must have RSI ─────────────────────────────────────────────────
  if (rsi14 === null) return null;

  // ── Guard: must have a reference EMA ────────────────────────────────────
  const refEma = ema50 ?? ema20;
  if (refEma === null) return null;

  // ── Guard: news risk active — no range trades ────────────────────────────
  if (newsRiskFlag) return null;

  // ── Guard: ADX must confirm weak trend (range) ───────────────────────────
  if (adx14 !== null && adx14 >= ADX_MAX) return null;

  // ── Guard: breakout rejection — price must stay near EMA cluster ─────────
  const distFromEma = Math.abs(price - refEma) / price;
  if (distFromEma > breakoutMargin) return null;

  // ── Phase 7B: stale regime gate ─────────────────────────────────────────
  // Suppress signal when regime has been active too long (stale RANGE degrades).
  // Active whenever ctx is provided — falls back to MAX_REGIME_AGE (20) if no
  // explicit override in params. Optimizer passes overrides; live router passes
  // ctx with no params, so the default applies.
  if (ctx !== undefined) {
    const maxAge = params?.maxRegimeAge ?? MAX_REGIME_AGE;
    if (ctx.regimeAge > maxAge) return null;
  }

  // ── RSI extreme entry ────────────────────────────────────────────────────
  let signalType: string | null = null;

  if (rsi14 <= rsiOversold) {
    signalType = 'buy';
  } else if (rsi14 >= rsiOverbought) {
    signalType = 'sell';
  }

  if (!signalType) return null;

  // ── Phase 7B: range location filter ─────────────────────────────────────
  // Longs only in the lower half of the range; shorts only in the upper half.
  // Only applied when ctx carries a valid rangeLocation and params define the threshold.
  if (ctx?.rangeLocation !== null && ctx?.rangeLocation !== undefined && params?.rangeLocationThreshold !== undefined) {
    const loc = ctx.rangeLocation;
    const threshold = params.rangeLocationThreshold;
    if (signalType === 'buy'  && loc > threshold) return null;   // buying too high in range
    if (signalType === 'sell' && loc < threshold) return null;   // selling too low in range
  }

  // ── Signal ───────────────────────────────────────────────────────────────
  const emaLabel = ema50 !== null ? 'EMA50' : 'EMA20';
  const direction = signalType === 'buy' ? 'oversold' : 'overbought';
  const locInfo = ctx?.rangeLocation !== null && ctx?.rangeLocation !== undefined
    ? `, loc=${ctx.rangeLocation.toFixed(2)}`
    : '';
  const ageInfo = ctx !== undefined ? `, age=${ctx.regimeAge}` : '';

  return {
    source:     'regime-strategy-router',
    symbol:     state.symbol,
    signalType,
    confidence: analysis.confidence,
    rationale:  `RANGE: RSI ${direction} (${rsi14.toFixed(1)}), price within ${(distFromEma * 100).toFixed(2)}% of ${emaLabel}${adx14 !== null ? `, ADX=${adx14.toFixed(1)}` : ''}${locInfo}${ageInfo}`,
    timestamp:  new Date().toISOString(),
    strategyId: 'regime-range',
    variantId:  'range-v1',
    baseState:  state,
  };
}
