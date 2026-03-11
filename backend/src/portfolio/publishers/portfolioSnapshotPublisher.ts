// Publishes PortfolioSnapshot to portfolio.snapshot topic
import { EventBus } from '../../events/eventBus';
import { PortfolioSnapshot } from '../../models/PortfolioSnapshot';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishPortfolioSnapshot(bus: EventBus, snapshot: PortfolioSnapshot, correlationId?: string): void {
  const envelope: EventEnvelope<PortfolioSnapshot> = {
    id: (Math.random() * 1e17).toString(36),
    topic: 'portfolio.snapshot',
    timestamp: new Date().toISOString(),
    producer: 'portfolio',
    version: '1.0.0',
    correlationId,
    payload: snapshot
  };
  bus.publish('portfolio.snapshot', envelope);
}
