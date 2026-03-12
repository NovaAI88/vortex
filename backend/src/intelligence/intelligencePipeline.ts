// Orchestrates Intelligence Layer: subscribes to Processing, generates, and publishes signals
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicSignalGenerator } from './analytics/basicSignalGenerator';
import { publishTradeSignal } from './publishers/tradeSignalPublisher';

export function startIntelligencePipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
    const state = envelope.payload;
    const signal = basicSignalGenerator(state);
    // Bridge: log for API
    try { require('./state/signalState').logSignal(signal); } catch(e) {}
    publishTradeSignal(bus, signal, 'intelligence', envelope.correlationId);
  });
}
