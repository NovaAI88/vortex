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
const RANGE_LONG_MAX    = 0.20;  // Stage 1: longs only in lower 20% of range
const RANGE_SHORT_MIN   = 0.80;  // Stage 1: shorts only in upper 20% of range
const RANGE_DEEP_LONG_MAX  = 0.10; // Stage 2: context-first long zone (deep lower range)
const RANGE_DEEP_SHORT_MIN = 0.90; // Stage 2: context-first short zone (deep upper range)
const RSI_BUY_CONFIRM_MAX  = 45;   // Stage 2: reversal confirmation for deep-long context
const RSI_SELL_CONFIRM_MIN = 55;   // Stage 2: reversal confirmation for deep-short context

export const RANGE_SIGNAL_THRESHOLDS = {
  ADX_MAX,
  RSI_OVERSOLD,
  RSI_OVERBOUGHT,
  BREAKOUT_MARGIN,
  MAX_REGIME_AGE,
  RANGE_LONG_MAX,
  RANGE_SHORT_MIN,
  RANGE_DEEP_LONG_MAX,
  RANGE_DEEP_SHORT_MIN,
  RSI_BUY_CONFIRM_MAX,
  RSI_SELL_CONFIRM_MIN,
} as const;

// ─── Optional param overrides (optimizer only) ───────────────────────────────
// Live pipeline may pass this argument to tune entry filters.

export interface RangeSignalParams {
  rsiOversold?:            number;
  rsiOverbought?:          number;
  breakoutMargin?:         number;
  // Phase 7B: entry-quality filters (passed from router context, not from strategy state)
  maxRegimeAge?:           number;   // suppress signal if regimeAge > this; default: MAX_REGIME_AGE (20)
  // Stage 1: production range-location zones
  rangeLongMax?:           number;   // longs allowed only if loc <= this (default 0.20)
  rangeShortMin?:          number;   // shorts allowed only if loc >= this (default 0.80)
  // Stage 2: context-first confirmation zones/levels
  rangeDeepLongMax?:       number;   // deep-long context zone (default 0.10)
  rangeDeepShortMin?:      number;   // deep-short context zone (default 0.90)
  rsiBuyConfirmMax?:       number;   // buy confirmation RSI cap in deep-long zone (default 45)
  rsiSellConfirmMin?:      number;   // sell confirmation RSI floor in deep-short zone (default 55)
}

// ─── Router context (Phase 7B) ───────────────────────────────────────────────
// Carries live fields computed by the router layer (not by strategies).
// Strategies receive this as a read-only snapshot — no strategy owns this state.

export interface RangeRouterContext {
  regimeAge:     number;         // candles elapsed in current RANGE regime
  rangeLocation: number | null;  // (price − low20) / (high20 − low20); null if window not ready
}

export type RangeRejectionReason =
  | 'indicators_cold'
  | 'missing_rsi'
  | 'missing_reference_ema'
  | 'news_risk_active'
  | 'adx_too_high'
  | 'breakout_distance_too_high'
  | 'regime_too_old'
  | 'missing_range_location'
  | 'range_location_blocks_long'
  | 'range_location_blocks_short'
  | 'rsi_not_confirmed'
  | null;

export interface RangeSignalDiagnostic {
  signal: TradeSignal | null;
  rejectionReason: RangeRejectionReason;
  rangeLocation: number | null;
  signalType: 'buy' | 'sell' | null;
  triggerMode: 'rsi_extreme' | 'context_confirmed' | null;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateRangeSignal(
  state:    ProcessedMarketState,
  analysis: AIAnalysis,
  params?:  RangeSignalParams,
  ctx?:     RangeRouterContext,
): TradeSignal | null {
  return generateRangeSignalWithDiagnostic(state, analysis, params, ctx).signal;
}

export function generateRangeSignalWithDiagnostic(
  state:    ProcessedMarketState,
  analysis: AIAnalysis,
  params?:  RangeSignalParams,
  ctx?:     RangeRouterContext,
): RangeSignalDiagnostic {
  const price         = state.price;
  const adx14         = state.adx14  ?? null;
  const rsi14         = state.rsi14  ?? null;
  const ema20         = state.ema20  ?? null;
  const ema50         = state.ema50  ?? null;
  const newsRiskFlag  = state.newsRiskFlag ?? false;

  // Resolve thresholds — params override defaults
  const rsiOversold       = params?.rsiOversold       ?? RSI_OVERSOLD;
  const rsiOverbought     = params?.rsiOverbought     ?? RSI_OVERBOUGHT;
  const breakoutMargin    = params?.breakoutMargin    ?? BREAKOUT_MARGIN;
  const rangeLongMax      = params?.rangeLongMax      ?? RANGE_LONG_MAX;
  const rangeShortMin     = params?.rangeShortMin     ?? RANGE_SHORT_MIN;
  const rangeDeepLongMax  = params?.rangeDeepLongMax  ?? RANGE_DEEP_LONG_MAX;
  const rangeDeepShortMin = params?.rangeDeepShortMin ?? RANGE_DEEP_SHORT_MIN;
  const rsiBuyConfirmMax  = params?.rsiBuyConfirmMax  ?? RSI_BUY_CONFIRM_MAX;
  const rsiSellConfirmMin = params?.rsiSellConfirmMin ?? RSI_SELL_CONFIRM_MIN;

  const reject = (
    reason: RangeRejectionReason,
    signalType: 'buy' | 'sell' | null = null,
    loc: number | null = ctx?.rangeLocation ?? null,
  ): RangeSignalDiagnostic => ({
    signal: null,
    rejectionReason: reason,
    rangeLocation: loc,
    signalType,
    triggerMode: null,
  });

  // ── Guard: indicators must be warm ──────────────────────────────────────
  if (!state.indicatorsWarm) {
    return reject('indicators_cold');
  }

  // ── Guard: must have RSI ─────────────────────────────────────────────────
  if (rsi14 === null) {
    return reject('missing_rsi');
  }

  // ── Guard: must have a reference EMA ────────────────────────────────────
  const refEma = ema50 ?? ema20;
  if (refEma === null) {
    return reject('missing_reference_ema');
  }

  // ── Guard: news risk active — no range trades ────────────────────────────
  if (newsRiskFlag) {
    return reject('news_risk_active');
  }

  // ── Guard: ADX must confirm weak trend (range) ───────────────────────────
  if (adx14 !== null && adx14 >= ADX_MAX) {
    return reject('adx_too_high');
  }

  // ── Guard: breakout rejection — price must stay near EMA cluster ─────────
  const distFromEma = Math.abs(price - refEma) / price;
  if (distFromEma > breakoutMargin) {
    return reject('breakout_distance_too_high');
  }

  // ── Phase 7B: stale regime gate ─────────────────────────────────────────
  if (ctx !== undefined) {
    const maxAge = params?.maxRegimeAge ?? MAX_REGIME_AGE;
    if (ctx.regimeAge > maxAge) {
      return reject('regime_too_old');
    }
  }

  // ── Stage 1: range location production gate ─────────────────────────────
  if (ctx === undefined || ctx.rangeLocation === null || ctx.rangeLocation === undefined) {
    return reject('missing_range_location');
  }

  const loc = ctx.rangeLocation;

  // ── Stage 2: context-first reversal confirmation ────────────────────────
  // Path A (legacy discipline): RSI extremes
  // Path B (new context-first): deep range zone + softer RSI confirmation
  let signalType: 'buy' | 'sell' | null = null;
  let triggerMode: 'rsi_extreme' | 'context_confirmed' | null = null;

  if (rsi14 <= rsiOversold) {
    signalType = 'buy';
    triggerMode = 'rsi_extreme';
  } else if (rsi14 >= rsiOverbought) {
    signalType = 'sell';
    triggerMode = 'rsi_extreme';
  } else if (loc <= rangeDeepLongMax && rsi14 <= rsiBuyConfirmMax) {
    signalType = 'buy';
    triggerMode = 'context_confirmed';
  } else if (loc >= rangeDeepShortMin && rsi14 >= rsiSellConfirmMin) {
    signalType = 'sell';
    triggerMode = 'context_confirmed';
  }

  if (!signalType || !triggerMode) {
    return reject('rsi_not_confirmed');
  }

  if (signalType === 'buy' && loc > rangeLongMax) {
    return reject('range_location_blocks_long', signalType, loc);
  }
  if (signalType === 'sell' && loc < rangeShortMin) {
    return reject('range_location_blocks_short', signalType, loc);
  }

  // ── Signal ───────────────────────────────────────────────────────────────
  const emaLabel = ema50 !== null ? 'EMA50' : 'EMA20';
  const direction = signalType === 'buy' ? 'long-mean-reversion' : 'short-mean-reversion';
  const locInfo = `, loc=${loc.toFixed(2)}`;
  const ageInfo = ctx !== undefined ? `, age=${ctx.regimeAge}` : '';
  const triggerInfo = triggerMode === 'rsi_extreme' ? 'RSI-extreme' : 'context-confirmed';

  const signal: TradeSignal = {
    source:     'regime-strategy-router',
    symbol:     state.symbol,
    signalType,
    confidence: analysis.confidence,
    rationale:  `RANGE: ${direction}, ${triggerInfo}, RSI=${rsi14.toFixed(1)}, price within ${(distFromEma * 100).toFixed(2)}% of ${emaLabel}${adx14 !== null ? `, ADX=${adx14.toFixed(1)}` : ''}${locInfo}${ageInfo}`,
    timestamp:  new Date().toISOString(),
    strategyId: 'regime-range',
    variantId:  'range-v1',
    baseState:  state,
  };

  return { signal, rejectionReason: null, rangeLocation: loc, signalType, triggerMode };
}
