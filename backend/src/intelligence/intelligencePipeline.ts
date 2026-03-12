// Orchestrates Intelligence Layer: subscribes to Processing, generates, and publishes signals
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { publishTradeSignal } from './publishers/tradeSignalPublisher';
import { generateSignals } from './strategyRegistry';

export function startIntelligencePipeline(bus: EventBus): void {
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
