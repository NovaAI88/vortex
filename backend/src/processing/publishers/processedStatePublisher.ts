// Publishes ProcessedMarketState on event bus
import { EventBus } from '../../events/eventBus';
import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { EVENT_TOPICS } from '../../events/topics';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishProcessedMarketState(bus: EventBus, state: ProcessedMarketState, producer="processing", correlationId?: string): void {
  const envelope: EventEnvelope<ProcessedMarketState> = {
    id: (Math.random() * 1e17).toString(36),
    topic: EVENT_TOPICS.PROCESSING_STATE,
    timestamp: new Date().toISOString(),
    producer,
    version: "1.0.0",
    correlationId,
    payload: state,
  };
  bus.publish(EVENT_TOPICS.PROCESSING_STATE, envelope);
}
