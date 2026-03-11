// Publishes TradeSignal on event bus, advisory only
import { EventBus } from '../../events/eventBus';
import { TradeSignal } from '../../models/TradeSignal';
import { EVENT_TOPICS } from '../../events/topics';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishTradeSignal(bus: EventBus, signal: TradeSignal, producer='intelligence', correlationId?: string): void {
  const envelope: EventEnvelope<TradeSignal> = {
    id: (Math.random() * 1e17).toString(36),
    topic: EVENT_TOPICS.INTELLIGENCE_SIGNAL,
    timestamp: new Date().toISOString(),
    producer,
    version: '1.0.0',
    correlationId,
    payload: signal
  };
  bus.publish(EVENT_TOPICS.INTELLIGENCE_SIGNAL, envelope);
}
