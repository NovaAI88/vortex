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
  | 'rsi_not_extreme'
  | null;

export interface RangeSignalDiagnostic {
  signal: TradeSignal | null;
  rejectionReason: RangeRejectionReason;
  rangeLocation: number | null;
  signalType: 'buy' | 'sell' | null;
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
  const rsiOversold    = params?.rsiOversold    ?? RSI_OVERSOLD;
  const rsiOverbought  = params?.rsiOverbought  ?? RSI_OVERBOUGHT;
  const breakoutMargin = params?.breakoutMargin ?? BREAKOUT_MARGIN;
  const rangeLongMax   = params?.rangeLongMax   ?? RANGE_LONG_MAX;
  const rangeShortMin  = params?.rangeShortMin  ?? RANGE_SHORT_MIN;

  // ── Guard: indicators must be warm ──────────────────────────────────────
  if (!state.indicatorsWarm) {
    return { signal: null, rejectionReason: 'indicators_cold', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Guard: must have RSI ─────────────────────────────────────────────────
  if (rsi14 === null) {
    return { signal: null, rejectionReason: 'missing_rsi', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Guard: must have a reference EMA ────────────────────────────────────
  const refEma = ema50 ?? ema20;
  if (refEma === null) {
    return { signal: null, rejectionReason: 'missing_reference_ema', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Guard: news risk active — no range trades ────────────────────────────
  if (newsRiskFlag) {
    return { signal: null, rejectionReason: 'news_risk_active', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Guard: ADX must confirm weak trend (range) ───────────────────────────
  if (adx14 !== null && adx14 >= ADX_MAX) {
    return { signal: null, rejectionReason: 'adx_too_high', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Guard: breakout rejection — price must stay near EMA cluster ─────────
  const distFromEma = Math.abs(price - refEma) / price;
  if (distFromEma > breakoutMargin) {
    return { signal: null, rejectionReason: 'breakout_distance_too_high', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Phase 7B: stale regime gate ─────────────────────────────────────────
  if (ctx !== undefined) {
    const maxAge = params?.maxRegimeAge ?? MAX_REGIME_AGE;
    if (ctx.regimeAge > maxAge) {
      return { signal: null, rejectionReason: 'regime_too_old', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
    }
  }

  // ── RSI extreme entry ────────────────────────────────────────────────────
  let signalType: 'buy' | 'sell' | null = null;

  if (rsi14 <= rsiOversold) {
    signalType = 'buy';
  } else if (rsi14 >= rsiOverbought) {
    signalType = 'sell';
  }

  if (!signalType) {
    return { signal: null, rejectionReason: 'rsi_not_extreme', rangeLocation: ctx?.rangeLocation ?? null, signalType: null };
  }

  // ── Stage 1: range location production gate ─────────────────────────────
  if (ctx === undefined || ctx.rangeLocation === null || ctx.rangeLocation === undefined) {
    return { signal: null, rejectionReason: 'missing_range_location', rangeLocation: null, signalType };
  }

  const loc = ctx.rangeLocation;
  if (signalType === 'buy' && loc > rangeLongMax) {
    return { signal: null, rejectionReason: 'range_location_blocks_long', rangeLocation: loc, signalType };
  }
  if (signalType === 'sell' && loc < rangeShortMin) {
    return { signal: null, rejectionReason: 'range_location_blocks_short', rangeLocation: loc, signalType };
  }

  // ── Signal ───────────────────────────────────────────────────────────────
  const emaLabel = ema50 !== null ? 'EMA50' : 'EMA20';
  const direction = signalType === 'buy' ? 'oversold' : 'overbought';
  const locInfo = `, loc=${loc.toFixed(2)}`;
  const ageInfo = ctx !== undefined ? `, age=${ctx.regimeAge}` : '';

  const signal: TradeSignal = {
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

  return { signal, rejectionReason: null, rangeLocation: loc, signalType };
}
