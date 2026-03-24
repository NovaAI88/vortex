// VORTEX — AI Analysis Pipeline (Phase 2)
//
// Parallel subscriber to PROCESSING_STATE — does NOT modify or interrupt
// the existing intelligence pipeline or strategy registry.
//
// Cadence control:
//   - Recomputes on every PROCESSING_STATE event (already throttled by candle boundary)
//   - Publishes AI_ANALYSIS only when regime changes OR confidence shifts > threshold
//   - Always publishes at minimum once per minute (heartbeat)
//
// Stability gate:
//   - Regime candidate must be consistent for STABILITY_TICKS before committing
//   - Prevents thrashing on borderline ADX values
//
// Read-only: no imports from execution, risk, operator, portfolio.

import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { getSnapshot } from '../processing/featurePipeline';
import { analyzeMarket, AIAnalysis } from './aiAnalysisEngine';
import { logger } from '../utils/logger';

// ─── Stability gate ────────────────────────────────────────────────────────
const STABILITY_TICKS   = 3;    // consecutive ticks required before regime commits
const CONFIDENCE_DELTA  = 0.05; // minimum confidence shift to trigger re-publish
const HEARTBEAT_MS      = 60_000; // always publish at least once per minute

// ─── State ─────────────────────────────────────────────────────────────────
let lastCommitted:   AIAnalysis | null = null;
let candidate:       string | null = null; // regime candidate string
let candidateTicks:  number        = 0;
let lastPublishedAt: number        = 0;

// ─── Helpers ───────────────────────────────────────────────────────────────

function shouldPublish(next: AIAnalysis): boolean {
  if (!lastCommitted) return true;

  const regimeChanged     = next.regime !== lastCommitted.regime;
  const biasChanged       = next.bias   !== lastCommitted.bias;
  const warmChanged       = next.indicatorsWarm !== lastCommitted.indicatorsWarm;
  const confShifted       = Math.abs(next.confidence - lastCommitted.confidence) >= CONFIDENCE_DELTA;
  const heartbeatDue      = Date.now() - lastPublishedAt >= HEARTBEAT_MS;

  return regimeChanged || biasChanged || warmChanged || confShifted || heartbeatDue;
}

function applyStabilityGate(nextRegime: string): boolean {
  if (nextRegime === candidate) {
    candidateTicks++;
  } else {
    candidate      = nextRegime;
    candidateTicks = 1;
  }
  // HIGH_RISK always commits immediately (safety)
  if (nextRegime === 'HIGH_RISK') return true;
  return candidateTicks >= STABILITY_TICKS;
}

// ─── Public API ────────────────────────────────────────────────────────────

export function getLastAnalysis(): AIAnalysis | null {
  return lastCommitted;
}

export function startAIAnalysisPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
    try {
      const state = envelope.payload;
      const snap  = getSnapshot();

      const price        = state?.price        ?? 0;
      const newsRiskFlag = state?.newsRiskFlag  ?? false;

      const analysis = analyzeMarket(snap, price, newsRiskFlag);

      // Apply stability gate — regime must be stable for STABILITY_TICKS
      const committed = applyStabilityGate(analysis.regime);
      if (!committed) return; // still building consensus, skip publish

      // Check if this warrants publishing
      if (!shouldPublish(analysis)) return;

      lastCommitted   = analysis;
      lastPublishedAt = Date.now();

      // Publish to bus — downstream can subscribe; execution/risk do NOT
      bus.publish(EVENT_TOPICS.AI_ANALYSIS, {
        id: (Math.random() * 1e17).toString(36),
        topic: EVENT_TOPICS.AI_ANALYSIS,
        timestamp: new Date().toISOString(),
        producer: 'ai-analysis-pipeline',
        version: '1.0.0',
        payload: analysis,
      });

      // Log regime changes at info level; routine updates at debug
      if (!lastCommitted || analysis.regime !== lastCommitted?.regime) {
        logger.info('aiAnalysis', `Regime: ${analysis.regime} | Bias: ${analysis.bias} | Conf: ${(analysis.confidence * 100).toFixed(1)}%`, {
          regime: analysis.regime,
          bias:   analysis.bias,
          confidence: analysis.confidence,
          leverage:   analysis.leverageBand,
          warm:       analysis.indicatorsWarm,
        });
      } else {
        logger.debug('aiAnalysis', `Updated: ${analysis.regime}/${analysis.bias} conf=${analysis.confidence}`);
      }
    } catch (e) {
      logger.error('aiAnalysis', 'Pipeline error', { err: String(e) });
    }
  });

  logger.info('aiAnalysis', 'AI analysis pipeline started', {
    stabilityTicks: STABILITY_TICKS,
    heartbeatMs:    HEARTBEAT_MS,
  });
}
