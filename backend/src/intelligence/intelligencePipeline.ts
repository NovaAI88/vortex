// Orchestrates Intelligence Layer: subscribes to Processing, generates, and publishes signals
//
// PHASE 3 NOTE:
//   Signal generation is DISABLED. regimeStrategyRouter is now the sole signal producer.
//   This pipeline is preserved for backward compatibility (API wiring, strategy registry,
//   performance tracking) but must NOT emit signals while the regime router is active.
//
//   To re-enable (e.g. for A/B testing), set LEGACY_INTELLIGENCE_ENABLED=true in env.
//   Default: OFF.

import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { publishTradeSignal } from './publishers/tradeSignalPublisher';
import { generateSignals } from './strategyRegistry';
import { logger } from '../utils/logger';

const LEGACY_ENABLED = process.env.LEGACY_INTELLIGENCE_ENABLED === 'true';

export function startIntelligencePipeline(bus: EventBus): void {
  if (!LEGACY_ENABLED) {
    logger.info('intelligencePipeline', 'Legacy momentum pipeline DISABLED — regime router is sole signal producer');
    return;
  }

  logger.warn('intelligencePipeline', 'LEGACY_INTELLIGENCE_ENABLED=true — momentum pipeline active alongside regime router');

  bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
    const state = envelope.payload;
    const signals = generateSignals(state);
    signals.forEach(signal => {
      // Bridge: log for API
      try { require('./state/signalState').logSignal(signal); } catch(e) {}
      publishTradeSignal(bus, signal, 'intelligence', envelope.correlationId);
    });
  });
}
