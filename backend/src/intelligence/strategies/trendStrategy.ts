// VORTEX — Trend Strategy (Phase 3 / Phase 7B)
//
// Trend-following strategy for TREND regime.
// Entry logic: EMA20 pullback with full EMA stack alignment + ADX confirmation.
//
// Signal conditions (all must pass):
//   - adx14 >= 25
//   - EMA stack aligned: ema20/ema50/ema200 fully ordered (or partial if ema200 not warm)
//   - Effective bias is LONG or SHORT (from analysis, or inferred from EMA stack
//     when analysis.bias === 'NEUTRAL' and allowStackInferredBias is true)
//   - RSI not overextended: LONG → rsi14 < 75 | SHORT → rsi14 > 25
//   - Pullback window: price within pullbackMin–pullbackMax of ema20 (EMA retest zone)
//   - Pullback direction: price within pullbackDirectionTolerance of ema20
//     on the correct side (LONG: price at or marginally above EMA20;
//     SHORT: price at or marginally below EMA20)
//
// Signal type:
//   - "buy"  when effective bias is LONG and price in pullback zone
//   - "sell" when effective bias is SHORT and price in pullback zone
//   - null   when conditions not met
//
// Phase 7B changes (diagnostic-driven):
//   - pullbackMin default lowered 0.003 → 0.002 (was blocking EMA-touch entries)
//   - pullbackMax default raised 0.025 → 0.035 (was blocking deeper valid retracements)
//   - pullbackDirectionTolerance replaces the old reuse of pullbackMin as a
//     direction cap — decouples distance floor from direction gate
//   - allowStackInferredBias: when analysis.bias is NEUTRAL but regime is TREND,
//     infer direction from EMA stack (safe: regime engine already validated stack)
//
// AI boundary: read-only. No imports from execution, risk, operator, portfolio.

import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';
import { AIAnalysis, Bias } from '../aiAnalysisEngine';

// ─── Thresholds (live defaults) ──────────────────────────────────────────────

const ADX_MIN                      = 25;
const RSI_LONG_MAX                 = 75;    // don't buy into overbought
const RSI_SHORT_MIN                = 25;    // don't sell into oversold
const PULLBACK_MIN                 = 0.002; // 0.2% — min distance from EMA20 (Phase 7B: was 0.003)
const PULLBACK_MAX                 = 0.035; // 3.5% — max distance from EMA20 (Phase 7B: was 0.025)
const PULLBACK_DIRECTION_TOLERANCE = 0.005; // 0.5% — how far above EMA20 a LONG is still valid
                                            // (Phase 7B: replaces reuse of pullbackMin as direction cap)
const ALLOW_STACK_INFERRED_BIAS    = true;  // Phase 7B: infer bias from EMA stack when NEUTRAL
const MIN_REGIME_AGE               = 3;     // Phase 2: skip entry if regime switched < N candles ago

// ─── Optional param overrides (optimizer only) ───────────────────────────────
// Live pipeline never passes this argument. Defaults to module constants.

export interface TrendSignalParams {
  adxMin?:                     number;
  pullbackMin?:                number;
  pullbackMax?:                number;
  rsiLongMax?:                 number;
  rsiShortMin?:                number;
  // Phase 7B
  pullbackDirectionTolerance?: number;  // direction cap — decoupled from pullbackMin
  allowStackInferredBias?:     boolean; // infer LONG/SHORT from EMA stack when bias=NEUTRAL
  // Phase 2 (post-isolation)
  minRegimeAge?:               number;  // block entries when regime is too fresh (default 3)
}

// ─── Rejection reason (Phase 7B diagnostic) ──────────────────────────────────
// Returned by generateTrendSignalWithDiagnostic() only.
// generateTrendSignal() (live path) is unchanged in signature.

export type TrendRejectionReason =
  | 'indicators_cold'
  | 'missing_adx_or_ema20'
  | 'adx_too_low'
  | 'regime_too_fresh'         // regimeAge < minRegimeAge (Phase 2)
  | 'neutral_bias'             // bias NEUTRAL and stack inference disabled or stack ambiguous
  | 'ema_stack_misaligned'
  | 'rsi_overextended'
  | 'price_outside_pullback_window'
  | 'pullback_direction_wrong'
  | null;  // null = signal was emitted (no rejection)

export interface TrendSignalDiagnostic {
  signal:           ReturnType<typeof generateTrendSignal>;
  rejectionReason:  TrendRejectionReason;
  effectiveBias:    string;  // actual bias used (may differ from analysis.bias if inferred)
  biasWasInferred:  boolean; // true when stack inference was used
  // Indicator snapshot at evaluation time — for near-miss analysis
  adx14AtEval:      number | null;
  ema20AtEval:      number | null;
  ema50AtEval:      number | null;
  ema200AtEval:     number | null;
  rsi14AtEval:      number | null;
  distFromEma20:    number | null;
  bias:             string; // raw analysis.bias (before inference)
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Resolve the effective bias to use for signal generation.
 *
 * If analysis.bias is directional → use it directly.
 * If analysis.bias is NEUTRAL and allowStackInferredBias is true:
 *   → infer from EMA stack (same signal the regime engine used for regime call).
 *   → ema20 > ema50 → LONG; ema20 < ema50 → SHORT; ambiguous → remain NEUTRAL.
 * Otherwise → NEUTRAL (no signal).
 *
 * Returns { bias, wasInferred }.
 */
function resolveEffectiveBias(
  analysisBias:           Bias,
  ema20:                  number,
  ema50:                  number | null,
  allowStackInferred:     boolean,
): { bias: Bias; wasInferred: boolean } {
  if (analysisBias !== 'NEUTRAL') {
    return { bias: analysisBias, wasInferred: false };
  }
  if (!allowStackInferred || ema50 === null) {
    return { bias: 'NEUTRAL', wasInferred: false };
  }
  if (ema20 > ema50) return { bias: 'LONG',  wasInferred: true };
  if (ema20 < ema50) return { bias: 'SHORT', wasInferred: true };
  return { bias: 'NEUTRAL', wasInferred: false }; // EMAs equal — ambiguous
}

/**
 * Check EMA stack alignment for the given effective bias.
 * Returns true if aligned, false if not.
 */
function isEmaStackAligned(
  bias:  Bias,
  ema20: number,
  ema50: number | null,
  ema200: number | null,
): boolean {
  if (bias === 'LONG') {
    const fullStack    = ema50 !== null && ema200 !== null && ema20 > ema50 && ema50 > ema200;
    const partialStack = ema50 !== null && ema200 === null && ema20 > ema50;
    return fullStack || partialStack;
  } else {
    const fullStack    = ema50 !== null && ema200 !== null && ema20 < ema50 && ema50 < ema200;
    const partialStack = ema50 !== null && ema200 === null && ema20 < ema50;
    return fullStack || partialStack;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function generateTrendSignal(
  state:      ProcessedMarketState,
  analysis:   AIAnalysis,
  params?:    TrendSignalParams,
  regimeAge?: number,  // Phase 2: candles elapsed since regime switched (from router/simulator)
): TradeSignal | null {
  const price  = state.price;
  const adx14  = state.adx14  ?? null;
  const rsi14  = state.rsi14  ?? null;
  const ema20  = state.ema20  ?? null;
  const ema50  = state.ema50  ?? null;
  const ema200 = state.ema200 ?? null;

  // Resolve thresholds — params override defaults; live path never provides params
  const adxMin                    = params?.adxMin                    ?? ADX_MIN;
  const pullbackMin                = params?.pullbackMin                ?? PULLBACK_MIN;
  const pullbackMax                = params?.pullbackMax                ?? PULLBACK_MAX;
  const rsiLongMax                 = params?.rsiLongMax                 ?? RSI_LONG_MAX;
  const rsiShortMin                = params?.rsiShortMin                ?? RSI_SHORT_MIN;
  const pullbackDirectionTolerance = params?.pullbackDirectionTolerance ?? PULLBACK_DIRECTION_TOLERANCE;
  const allowStackInferredBias     = params?.allowStackInferredBias     ?? ALLOW_STACK_INFERRED_BIAS;
  const minRegimeAge               = params?.minRegimeAge               ?? MIN_REGIME_AGE;

  // ── Guard: indicators must be warm ──────────────────────────────────────
  if (!state.indicatorsWarm) return null;

  // ── Guard: must have minimum indicators ─────────────────────────────────
  if (adx14 === null || ema20 === null) return null;

  // ── Guard: ADX must confirm trend strength ───────────────────────────────
  if (adx14 < adxMin) return null;

  // ── Guard: regime must be established (Phase 2) ──────────────────────────
  // Avoid entering on the first few candles of a regime switch — the regime
  // engine hasn't had time to confirm direction and entries here lose at >50%.
  if (regimeAge !== undefined && regimeAge < minRegimeAge) return null;

  // ── Resolve effective bias ───────────────────────────────────────────────
  // When analysis.bias is NEUTRAL, attempt EMA-stack inference if enabled.
  // Safe: regime engine already validated EMA stack for the TREND call.
  const { bias } = resolveEffectiveBias(analysis.bias, ema20, ema50, allowStackInferredBias);
  if (bias === 'NEUTRAL') return null;

  // ── Guard: EMA stack alignment ──────────────────────────────────────────
  if (!isEmaStackAligned(bias, ema20, ema50, ema200)) return null;

  // ── Guard: RSI not overextended ──────────────────────────────────────────
  if (rsi14 !== null) {
    if (bias === 'LONG'  && rsi14 >= rsiLongMax)  return null;
    if (bias === 'SHORT' && rsi14 <= rsiShortMin) return null;
  }

  // ── Guard: price in EMA20 pullback window ────────────────────────────────
  const distFromEma20 = Math.abs(price - ema20) / price;
  if (distFromEma20 < pullbackMin || distFromEma20 > pullbackMax) return null;

  // ── Guard: pullback direction ────────────────────────────────────────────
  // LONG: price should be at or marginally above EMA20 (retesting support from above).
  //   Reject if price is more than pullbackDirectionTolerance above EMA20
  //   (that would be an extension, not a pullback).
  // SHORT: mirror — price should be at or marginally below EMA20.
  //   Reject if price is more than pullbackDirectionTolerance below EMA20.
  //
  // Note: pullbackDirectionTolerance is intentionally decoupled from pullbackMin.
  // pullbackMin controls how close to EMA20 a valid entry is.
  // pullbackDirectionTolerance controls which side of EMA20 is acceptable.
  if (bias === 'LONG'  && price > ema20 * (1 + pullbackDirectionTolerance)) return null;
  if (bias === 'SHORT' && price < ema20 * (1 - pullbackDirectionTolerance)) return null;

  // ── Signal ───────────────────────────────────────────────────────────────
  const signalType = bias === 'LONG' ? 'buy' : 'sell';
  const biasSource = bias !== analysis.bias ? `${bias}(inferred)` : bias;

  return {
    source:     'regime-strategy-router',
    symbol:     state.symbol,
    signalType,
    confidence: analysis.confidence,
    rationale:  `TREND/${biasSource}: EMA20 pullback, ADX=${adx14.toFixed(1)}, dist=${(distFromEma20 * 100).toFixed(2)}%${rsi14 !== null ? `, RSI=${rsi14.toFixed(1)}` : ''}`,
    timestamp:  new Date().toISOString(),
    strategyId: 'regime-trend',
    variantId:  'trend-v1',
    baseState:  state,
  };
}

// ─── Diagnostic variant (Phase 7B) ───────────────────────────────────────────
// Mirrors generateTrendSignal() exactly, but returns a structured rejection
// reason + indicator snapshot instead of just null on rejection.
// Used exclusively by analyzeTrendSuppression() in entryQualityAnalyzer.
// Live router calls generateTrendSignal() only — this has no live path.

export function generateTrendSignalWithDiagnostic(
  state:      ProcessedMarketState,
  analysis:   AIAnalysis,
  params?:    TrendSignalParams,
  regimeAge?: number,  // Phase 2: candles elapsed since regime switched
): TrendSignalDiagnostic {
  const price  = state.price;
  const adx14  = state.adx14  ?? null;
  const rsi14  = state.rsi14  ?? null;
  const ema20  = state.ema20  ?? null;
  const ema50  = state.ema50  ?? null;
  const ema200 = state.ema200 ?? null;

  const adxMin                    = params?.adxMin                    ?? ADX_MIN;
  const pullbackMin                = params?.pullbackMin                ?? PULLBACK_MIN;
  const pullbackMax                = params?.pullbackMax                ?? PULLBACK_MAX;
  const rsiLongMax                 = params?.rsiLongMax                 ?? RSI_LONG_MAX;
  const rsiShortMin                = params?.rsiShortMin                ?? RSI_SHORT_MIN;
  const pullbackDirectionTolerance  = params?.pullbackDirectionTolerance  ?? PULLBACK_DIRECTION_TOLERANCE;
  const allowStackInferredBias     = params?.allowStackInferredBias     ?? ALLOW_STACK_INFERRED_BIAS;
  const minRegimeAge               = params?.minRegimeAge               ?? MIN_REGIME_AGE;

  const distFromEma20 = ema20 !== null ? Math.abs(price - ema20) / price : null;

  // Resolve effective bias (same logic as generateTrendSignal)
  const { bias: effectiveBias, wasInferred: biasWasInferred } = ema20 !== null
    ? resolveEffectiveBias(analysis.bias, ema20, ema50, allowStackInferredBias)
    : { bias: analysis.bias, wasInferred: false };

  const snapshot = {
    adx14AtEval:   adx14,
    ema20AtEval:   ema20,
    ema50AtEval:   ema50,
    ema200AtEval:  ema200,
    rsi14AtEval:   rsi14,
    distFromEma20,
    bias:          analysis.bias,  // raw analysis bias
    effectiveBias,
    biasWasInferred,
  };

  if (!state.indicatorsWarm) {
    return { signal: null, rejectionReason: 'indicators_cold', ...snapshot };
  }
  if (adx14 === null || ema20 === null) {
    return { signal: null, rejectionReason: 'missing_adx_or_ema20', ...snapshot };
  }
  if (adx14 < adxMin) {
    return { signal: null, rejectionReason: 'adx_too_low', ...snapshot };
  }
  if (regimeAge !== undefined && regimeAge < minRegimeAge) {
    return { signal: null, rejectionReason: 'regime_too_fresh', ...snapshot };
  }
  if (effectiveBias === 'NEUTRAL') {
    return { signal: null, rejectionReason: 'neutral_bias', ...snapshot };
  }
  if (!isEmaStackAligned(effectiveBias, ema20, ema50, ema200)) {
    return { signal: null, rejectionReason: 'ema_stack_misaligned', ...snapshot };
  }
  if (rsi14 !== null) {
    if (effectiveBias === 'LONG'  && rsi14 >= rsiLongMax)  return { signal: null, rejectionReason: 'rsi_overextended', ...snapshot };
    if (effectiveBias === 'SHORT' && rsi14 <= rsiShortMin) return { signal: null, rejectionReason: 'rsi_overextended', ...snapshot };
  }
  if (distFromEma20 === null || distFromEma20 < pullbackMin || distFromEma20 > pullbackMax) {
    return { signal: null, rejectionReason: 'price_outside_pullback_window', ...snapshot };
  }
  if (effectiveBias === 'LONG'  && price > ema20 * (1 + pullbackDirectionTolerance)) {
    return { signal: null, rejectionReason: 'pullback_direction_wrong', ...snapshot };
  }
  if (effectiveBias === 'SHORT' && price < ema20 * (1 - pullbackDirectionTolerance)) {
    return { signal: null, rejectionReason: 'pullback_direction_wrong', ...snapshot };
  }

  // Signal emitted
  const signalType = effectiveBias === 'LONG' ? 'buy' : 'sell';
  const biasSource = biasWasInferred ? `${effectiveBias}(inferred)` : effectiveBias;
  const signal = {
    source:     'regime-strategy-router',
    symbol:     state.symbol,
    signalType,
    confidence: analysis.confidence,
    rationale:  `TREND/${biasSource}: EMA20 pullback, ADX=${adx14.toFixed(1)}, dist=${(distFromEma20! * 100).toFixed(2)}%${rsi14 !== null ? `, RSI=${rsi14.toFixed(1)}` : ''}`,
    timestamp:  new Date().toISOString(),
    strategyId: 'regime-trend',
    variantId:  'trend-v1',
    baseState:  state,
  };

  return { signal, rejectionReason: null, ...snapshot };
}
