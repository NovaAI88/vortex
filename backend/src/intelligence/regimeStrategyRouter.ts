// VORTEX — Regime Strategy Router (Phase 3 / Phase 7B)
//
// The ONLY active signal producer in the system.
// Replaces intelligencePipeline as signal source.
//
// Subscribes to:
//   AI_ANALYSIS      → caches latest AIAnalysis (regime + bias + confidence)
//   PROCESSING_STATE → on each market tick, routes to the correct strategy
//
// Strategy selection:
//   TREND     → trendStrategy.generateTrendSignal()
//   RANGE     → rangeStrategy.generateRangeSignal()
//   HIGH_RISK → highRiskStrategy.generateHighRiskSignal() → always null
//
// Properties:
//   - One active strategy at a time (no blending)
//   - Pure function strategies (no shared mutable state between them)
//   - AI remains advisory only — signal flows into existing pipeline
//   - Router skips if no analysis has been committed yet
//
// Phase 7B additions (router-owned state only — strategies remain pure):
//   - regimeAge counter: tracks candles elapsed in current regime
//   - Rolling 20-candle price window: computes rangeLocation for RANGE context
//   - Confirmation-tick gate: pending RANGE signal must survive 1 additional candle
//     before being emitted. State lives here, not in the strategy.
//
// AI boundary: read-only. No imports from execution, risk, operator, portfolio.

import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { AIAnalysis } from './aiAnalysisEngine';
import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { generateTrendSignal }    from './strategies/trendStrategy';
import { generateRangeSignal, RangeRouterContext }    from './strategies/rangeStrategy';
import { generateHighRiskSignal } from './strategies/highRiskStrategy';
import { publishTradeSignal }     from './publishers/tradeSignalPublisher';
import { logSignal }              from './state/signalState';
import { logger } from '../utils/logger';

// ─── Feature flags ───────────────────────────────────────────────────────────
// ENABLE_TREND: set to 'true' to allow TREND signals. Default OFF for Phase 7B
// isolated RANGE evaluation. Reversible: restart with ENABLE_TREND=true to re-enable.

const ENABLE_TREND = process.env.ENABLE_TREND === 'true';

// ─── Router state ────────────────────────────────────────────────────────────
// Single cache of the latest committed AIAnalysis from the AI pipeline.
// The AI pipeline already applies a 3-tick stability gate before publishing,
// so this value is already stable when received here.

let latestAnalysis: AIAnalysis | null = null;

// ── Phase 7B: regime tracking ─────────────────────────────────────────────
// regimeAge: candles elapsed in the current regime (reset on regime switch).
// currentRegime: last known regime string for detecting switches.

let currentRegime:    string | null = null;
let regimeAge:        number        = 0;

// ── Phase 7B: rolling 20-candle price window ──────────────────────────────
// Stores the close prices of the last 20 ProcessedMarketState ticks.
// Used to compute rangeLocation for RANGE context.
// Bounded at RANGE_WINDOW_SIZE — oldest entry evicted on each tick.

const RANGE_WINDOW_SIZE = 20;
const priceWindow: number[] = [];  // [oldest ... newest]
let   highWindow:  number[] = [];  // parallel: candle highs (or price if unavailable)
let   lowWindow:   number[] = [];  // parallel: candle lows

// ── Phase 7B: confirmation-tick gate ─────────────────────────────────────
// When a RANGE signal is generated, it is held as pending for 1 candle.
// On the next candle, if the strategy still generates a signal in the same
// direction, it is emitted. Otherwise the pending signal is discarded.
// This prevents quick-stop entries caused by momentary RSI extremes.

interface PendingRangeSignal {
  signalType: string;  // 'buy' | 'sell'
  tickIndex:  number;  // which tick index it was generated on (for expiry)
}
let pendingRangeSignal: PendingRangeSignal | null = null;
let tickIndex = 0;  // increments on every PROCESSING_STATE event

// ─── Public API ──────────────────────────────────────────────────────────────

export function startRegimeStrategyRouter(bus: EventBus): void {
  // ── Step 1: Cache AI analysis as it arrives ──────────────────────────────
  bus.subscribe(EVENT_TOPICS.AI_ANALYSIS, envelope => {
    const analysis = envelope.payload as AIAnalysis;
    const prev = latestAnalysis;

    latestAnalysis = analysis;

    if (!prev || prev.regime !== analysis.regime) {
      logger.info('regimeRouter', `Regime switch → ${analysis.regime} | Bias: ${analysis.bias} | Strategy: ${routeLabel(analysis.regime)}`, {
        regime:     analysis.regime,
        bias:       analysis.bias,
        confidence: analysis.confidence,
        leverage:   analysis.leverageBand,
      });
      // Phase 7B: reset regime-age counter and pending confirmation on regime switch
      if (prev && prev.regime !== analysis.regime) {
        regimeAge = 0;
        currentRegime = analysis.regime;
        pendingRangeSignal = null;
      } else if (!prev) {
        currentRegime = analysis.regime;
      }
    }
  });

  // ── Step 2: On each market tick, route to active strategy ────────────────
  bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
    try {
      // Skip if no regime has been established yet
      if (!latestAnalysis) return;

      const state    = envelope.payload as ProcessedMarketState;
      const analysis = latestAnalysis;
      const thisTick = tickIndex++;

      // ── Phase 7B: regime age tracking ───────────────────────────────────
      if (currentRegime === null) {
        currentRegime = analysis.regime;
        regimeAge = 0;
      } else if (analysis.regime !== currentRegime) {
        currentRegime = analysis.regime;
        regimeAge = 0;
        pendingRangeSignal = null;
      } else {
        regimeAge++;
      }

      // ── Phase 7B: update rolling price window ────────────────────────────
      const tickHigh  = state.candleHigh ?? state.price;
      const tickLow   = state.candleLow  ?? state.price;
      priceWindow.push(state.price);
      highWindow.push(tickHigh);
      lowWindow.push(tickLow);
      if (priceWindow.length > RANGE_WINDOW_SIZE) {
        priceWindow.shift();
        highWindow.shift();
        lowWindow.shift();
      }

      // Build RangeRouterContext from router state — strategy is read-only
      const rangeCtx = buildRangeContext(state.price, regimeAge);

      // Route to strategy — pure function, no side effects except return value
      let signal = null;

      switch (analysis.regime) {
        case 'TREND':
          // ENABLE_TREND=false → suppress all TREND signals without touching strategy logic.
          // Set ENABLE_TREND=true in environment to re-enable.
          if (ENABLE_TREND) {
            signal = generateTrendSignal(state, analysis);
          }
          pendingRangeSignal = null;
          break;

        case 'RANGE': {
          const candidateSignal = generateRangeSignal(state, analysis, undefined, rangeCtx);

          if (candidateSignal) {
            // Confirmation-tick gate: was a signal in the same direction pending?
            if (
              pendingRangeSignal !== null &&
              pendingRangeSignal.signalType === candidateSignal.signalType &&
              pendingRangeSignal.tickIndex === thisTick - 1
            ) {
              // Confirmed — emit and clear pending
              signal = candidateSignal;
              pendingRangeSignal = null;
            } else {
              // First occurrence — hold as pending, do not emit yet
              pendingRangeSignal = { signalType: candidateSignal.signalType, tickIndex: thisTick };
              logger.debug('regimeRouter', `RANGE signal pending confirmation | dir=${candidateSignal.signalType} | tick=${thisTick}`);
            }
          } else {
            // No signal this tick — discard any stale pending
            pendingRangeSignal = null;
          }
          break;
        }

        case 'HIGH_RISK':
          signal = generateHighRiskSignal(state, analysis);
          pendingRangeSignal = null;
          break;

        default:
          logger.warn('regimeRouter', `Unknown regime: ${(analysis as any).regime} — skipping`);
          return;
      }

      // Only publish if strategy produced a confirmed signal
      if (!signal) return;

      // Log to in-memory signal store (for /api/signals endpoint)
      logSignal(signal);

      // Publish into the existing pipeline — decision → risk → execution
      publishTradeSignal(bus, signal, 'regime-router', envelope.correlationId);

      logger.debug('regimeRouter', `Signal: ${signal.signalType.toUpperCase()} via ${signal.strategyId}`, {
        symbol:     signal.symbol,
        confidence: signal.confidence,
        strategyId: signal.strategyId,
        regime:     analysis.regime,
        regimeAge,
      });
    } catch (e) {
      logger.error('regimeRouter', 'Router error on PROCESSING_STATE', { err: String(e) });
    }
  });

  logger.info('regimeRouter', `Regime strategy router started — TREND=${ENABLE_TREND ? 'ENABLED' : 'DISABLED (set ENABLE_TREND=true to re-enable)'} | RANGE=ENABLED`);
}

// ─── Router context builders ─────────────────────────────────────────────────

/**
 * Build a RangeRouterContext from current router state.
 * rangeLocation = (price − window_low) / (window_high − window_low).
 * Returns null if window not yet full (< RANGE_WINDOW_SIZE ticks).
 */
function buildRangeContext(price: number, age: number): RangeRouterContext {
  if (highWindow.length < RANGE_WINDOW_SIZE) {
    return { regimeAge: age, rangeLocation: null };
  }
  const windowHigh = Math.max(...highWindow);
  const windowLow  = Math.min(...lowWindow);
  const rangeLocation = (windowHigh > windowLow)
    ? Number(((price - windowLow) / (windowHigh - windowLow)).toFixed(4))
    : null;
  return { regimeAge: age, rangeLocation };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function routeLabel(regime: string): string {
  switch (regime) {
    case 'TREND':     return 'trendStrategy (EMA20 pullback)';
    case 'RANGE':     return 'rangeStrategy (RSI mean-reversion)';
    case 'HIGH_RISK': return 'highRiskStrategy (no-trade)';
    default:          return 'unknown';
  }
}
