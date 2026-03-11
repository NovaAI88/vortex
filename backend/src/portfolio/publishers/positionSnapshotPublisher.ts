// Publishes PositionSnapshot to position.snapshot topic
import { EventBus } from '../../events/eventBus';
import { PositionSnapshot } from '../../models/PositionSnapshot';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishPositionSnapshot(bus: EventBus, snapshot: PositionSnapshot, correlationId?: string): void {
  const envelope: EventEnvelope<PositionSnapshot> = {
    id: (Math.random() * 1e17).toString(36),
    topic: 'position.snapshot',
    timestamp: new Date().toISOString(),
    producer: 'portfolio',
    version: '1.0.0',
    correlationId,
    payload: snapshot
  };
  bus.publish('position.snapshot', envelope);
}
