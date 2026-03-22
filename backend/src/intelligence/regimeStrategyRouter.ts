// VORTEX — Regime Strategy Router (Phase 3)
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
// AI boundary: read-only. No imports from execution, risk, operator, portfolio.

import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { AIAnalysis } from './aiAnalysisEngine';
import { generateTrendSignal }    from './strategies/trendStrategy';
import { generateRangeSignal }    from './strategies/rangeStrategy';
import { generateHighRiskSignal } from './strategies/highRiskStrategy';
import { publishTradeSignal }     from './publishers/tradeSignalPublisher';
import { logSignal }              from './state/signalState';
import { logger } from '../utils/logger';

// ─── Router state ────────────────────────────────────────────────────────────
// Single cache of the latest committed AIAnalysis from the AI pipeline.
// The AI pipeline already applies a 3-tick stability gate before publishing,
// so this value is already stable when received here.

let latestAnalysis: AIAnalysis | null = null;

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
    }
  });

  // ── Step 2: On each market tick, route to active strategy ────────────────
  bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
    try {
      // Skip if no regime has been established yet
      if (!latestAnalysis) return;

      const state    = envelope.payload;
      const analysis = latestAnalysis;

      // Route to strategy — pure function, no side effects except return value
      let signal = null;

      switch (analysis.regime) {
        case 'TREND':
          signal = generateTrendSignal(state, analysis);
          break;
        case 'RANGE':
          signal = generateRangeSignal(state, analysis);
          break;
        case 'HIGH_RISK':
          signal = generateHighRiskSignal(state, analysis);
          break;
        default:
          logger.warn('regimeRouter', `Unknown regime: ${(analysis as any).regime} — skipping`);
          return;
      }

      // Only publish if strategy produced a signal
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
      });
    } catch (e) {
      logger.error('regimeRouter', 'Router error on PROCESSING_STATE', { err: String(e) });
    }
  });

  logger.info('regimeRouter', 'Regime strategy router started — sole signal producer active');
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
