// Publishes MarketEvent wrapped in EventEnvelope to the event bus
import { MarketEvent } from '../../models/MarketEvent';
import { EventBus } from '../../events/eventBus';
import { EVENT_TOPICS } from '../../events/topics';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishMarketEvent(bus: EventBus, payload: MarketEvent, producer="mock", correlationId?: string): void {
  const envelope: EventEnvelope<MarketEvent> = {
    id: (Math.random() * 1e17).toString(36),
    topic: EVENT_TOPICS.MARKET_EVENT,
    timestamp: new Date().toISOString(),
    producer,
    version: "1.0.0",
    correlationId,
    payload,
  };
  bus.publish(EVENT_TOPICS.MARKET_EVENT, envelope);
}
