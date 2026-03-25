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
import { generateTrendSignal, generateTrendSignalWithDiagnostic }    from './strategies/trendStrategy';
import { generateRangeSignalWithDiagnostic, RangeRouterContext }    from './strategies/rangeStrategy';
import { generateHighRiskSignal } from './strategies/highRiskStrategy';
import { publishTradeSignal }     from './publishers/tradeSignalPublisher';
import { logSignal }              from './state/signalState';
import { logger } from '../utils/logger';
import { trackSignal, updateSignalOutcomesForTick } from '../performance/signalOutcomeTracker';

// ─── Feature flags ───────────────────────────────────────────────────────────
// ENABLE_TREND: set to 'true' to allow TREND signals. Default OFF for Phase 7B
// isolated RANGE evaluation. Reversible: restart with ENABLE_TREND=true to re-enable.
// Read lazily (at call time) so test environments can set the env var after module load.

const isTrendEnabled = (): boolean => process.env.ENABLE_TREND === 'true';
const FLOW_DEBUG = process.env.VORTEX_FLOW_DEBUG === 'true';
const TREND_VALIDATION_MODE = process.env.VORTEX_TREND_VALIDATION_MODE === 'true';

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
let routerProcessingSeenCount = 0;

const SIGNAL_DEBUG = process.env.VORTEX_SIGNAL_DEBUG === 'true';

// ─── Public API ──────────────────────────────────────────────────────────────

export function resetRouterStateForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetRouterStateForTesting is test-only and requires NODE_ENV=test');
  }

  latestAnalysis = null;
  currentRegime = null;
  regimeAge = 0;
  priceWindow.length = 0;
  highWindow = [];
  lowWindow = [];
  pendingRangeSignal = null;
  tickIndex = 0;
  routerProcessingSeenCount = 0;
}

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
      routerProcessingSeenCount++;
      if (FLOW_DEBUG) {
        const st = envelope.payload as any;
        console.log('[FLOW router.processing_state_callback]', {
          seen: routerProcessingSeenCount,
          hasLatestAnalysis: !!latestAnalysis,
          analysisRegime: latestAnalysis?.regime ?? null,
          analysisBias: latestAnalysis?.bias ?? null,
          analysisConfidence: latestAnalysis?.confidence ?? null,
          symbol: st?.symbol ?? null,
          price: st?.price ?? null,
          indicatorsWarm: st?.indicatorsWarm ?? null,
          timestamp: st?.timestamp ?? null,
        });
      }

      // Skip if no regime has been established yet
      if (!latestAnalysis) return;

      const state    = envelope.payload as ProcessedMarketState;
      const analysis = latestAnalysis;
      const thisTick = tickIndex++;

      updateSignalOutcomesForTick({
        symbol: state.symbol,
        price: state.price,
        tickIndex: thisTick,
      });

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

      const trendValidationParams = TREND_VALIDATION_MODE ? {
        pullbackMin: 0,
        pullbackMax: 0.02,
        pullbackDirectionTolerance: 0.02,
        minRegimeAge: 1,
      } : undefined;

      // Route to strategy — pure function, no side effects except return value
      let signal = null;
      let rangeSignalMeta: {
        triggerMode: 'rsi_extreme' | 'context_confirmed' | null;
        rsi14AtSignal: number | null;
        rangeLocationAtSignal: number | null;
      } | null = null;

      switch (analysis.regime) {
        case 'TREND':
          // ENABLE_TREND=false → suppress all TREND signals without touching strategy logic.
          // Set ENABLE_TREND=true in environment to re-enable.
          if (isTrendEnabled()) {
            const trendDiag = generateTrendSignalWithDiagnostic(state, analysis, trendValidationParams, regimeAge);
            signal = trendDiag.signal;
            if (SIGNAL_DEBUG) {
              logger.info('regimeRouter.debug', 'TREND_EVAL', {
                tick: thisTick,
                regime: analysis.regime,
                bias: analysis.bias,
                confidence: analysis.confidence,
                regimeAge,
                indicatorsWarm: state.indicatorsWarm,
                price: state.price,
                ema20: state.ema20 ?? null,
                ema50: state.ema50 ?? null,
                ema200: state.ema200 ?? null,
                adx14: state.adx14 ?? null,
                rsi14: state.rsi14 ?? null,
                trendGateReason: trendDiag.rejectionReason ?? 'pass',
                signalEmitted: trendDiag.signal ? true : false,
                signalType: trendDiag.signal?.signalType ?? null,
              });
            }
          } else if (SIGNAL_DEBUG) {
            logger.info('regimeRouter.debug', 'TREND_DISABLED', {
              tick: thisTick,
              regime: analysis.regime,
              bias: analysis.bias,
              confidence: analysis.confidence,
              regimeAge,
              indicatorsWarm: state.indicatorsWarm,
              price: state.price,
              ema20: state.ema20 ?? null,
              ema50: state.ema50 ?? null,
              ema200: state.ema200 ?? null,
              adx14: state.adx14 ?? null,
              rsi14: state.rsi14 ?? null,
              trendGateReason: 'trend_disabled_flag',
              signalEmitted: false,
            });
          }
          pendingRangeSignal = null;
          break;

        case 'RANGE': {
          const rangeDiag = generateRangeSignalWithDiagnostic(state, analysis, undefined, rangeCtx);
          const candidateSignal = rangeDiag.signal;

          if (SIGNAL_DEBUG) {
            logger.info('regimeRouter.debug', 'RANGE_EVAL', {
              tick: thisTick,
              regime: analysis.regime,
              bias: analysis.bias,
              confidence: analysis.confidence,
              regimeAge,
              indicatorsWarm: state.indicatorsWarm,
              price: state.price,
              ema20: state.ema20 ?? null,
              ema50: state.ema50 ?? null,
              adx14: state.adx14 ?? null,
              rsi14: state.rsi14 ?? null,
              newsRiskFlag: state.newsRiskFlag ?? false,
              rangeLocation: rangeDiag.rangeLocation,
              rejectionReason: rangeDiag.rejectionReason ?? 'pass',
              triggerMode: rangeDiag.triggerMode ?? null,
              candidateSignal: candidateSignal ? true : false,
              candidateSignalType: candidateSignal?.signalType ?? null,
              pendingSignalType: pendingRangeSignal?.signalType ?? null,
              pendingTickIndex: pendingRangeSignal?.tickIndex ?? null,
            });
          }

          if (candidateSignal) {
            // Confirmation-tick gate: was a signal in the same direction pending?
            if (
              pendingRangeSignal !== null &&
              pendingRangeSignal.signalType === candidateSignal.signalType &&
              pendingRangeSignal.tickIndex === thisTick - 1
            ) {
              // Confirmed — emit and clear pending
              signal = candidateSignal;
              rangeSignalMeta = {
                triggerMode: rangeDiag.triggerMode ?? null,
                rsi14AtSignal: state.rsi14 ?? null,
                rangeLocationAtSignal: rangeDiag.rangeLocation ?? null,
              };
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

      const baseSignalId = typeof (signal as any).id === 'string' && (signal as any).id.trim().length > 0
        ? (signal as any).id.trim()
        : `${signal.timestamp}:${signal.source}:${signal.strategyId}:${signal.symbol}:${thisTick}`;

      const signalForPublish = rangeSignalMeta
        ? {
            ...signal,
            id: baseSignalId,
            rationale: `${signal.rationale} | triggerMode=${rangeSignalMeta.triggerMode ?? 'null'}`,
            // Temporary router-level confidence separation for observability only.
            // NOT a calibrated expectancy score.
            confidence: rangeSignalMeta.triggerMode === 'context_confirmed'
              ? Number((analysis.confidence * 0.8).toFixed(4))
              : analysis.confidence,
            triggerMode: rangeSignalMeta.triggerMode,
            rsi14AtSignal: rangeSignalMeta.rsi14AtSignal,
            rangeLocationAtSignal: rangeSignalMeta.rangeLocationAtSignal,
          }
        : {
            ...signal,
            id: baseSignalId,
          };

      const signalId = (signalForPublish as any).id;
      if (typeof signalId !== 'string' || signalId.trim().length === 0) {
        throw new Error('regimeRouter tracking requires emitted TradeSignal.id as non-empty string');
      }

      const entryPrice = signalForPublish?.baseState?.price;
      if (!Number.isFinite(entryPrice)) {
        throw new Error(`regimeRouter tracking requires finite entryPrice from emitted signal baseState.price (signalId=${signalId})`);
      }

      trackSignal({
        signalId,
        symbol: signalForPublish.symbol,
        side: signalForPublish.signalType as 'buy' | 'sell',
        entryPrice,
        entryTick: thisTick,
        triggerMode: (signalForPublish as any).triggerMode ?? null,
        confidence: signalForPublish.confidence,
        rsi14AtSignal: (signalForPublish as any).rsi14AtSignal ?? null,
        rangeLocationAtSignal: (signalForPublish as any).rangeLocationAtSignal ?? null,
      });

      // Log to in-memory signal store (for /api/signals endpoint)
      logSignal(signalForPublish);

      // Publish into the existing pipeline — decision → risk → execution
      publishTradeSignal(bus, signalForPublish, 'regime-router', envelope.correlationId);

      logger.debug('regimeRouter', `Signal: ${signalForPublish.signalType.toUpperCase()} via ${signalForPublish.strategyId}`, {
        symbol:     signalForPublish.symbol,
        confidence: signalForPublish.confidence,
        strategyId: signalForPublish.strategyId,
        regime:     analysis.regime,
        regimeAge,
      });
    } catch (e) {
      logger.error('regimeRouter', 'Router error on PROCESSING_STATE', { err: String(e) });
    }
  });

  logger.info('regimeRouter', `Regime strategy router started — TREND=${isTrendEnabled() ? 'ENABLED' : 'DISABLED (set ENABLE_TREND=true to re-enable)'} | RANGE=ENABLED`);
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
