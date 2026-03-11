// Publishes ActionCandidate intent to decision.candidate topic (event bus)
import { EventBus } from '../../events/eventBus';
import { ActionCandidate } from '../../models/ActionCandidate';
import { EVENT_TOPICS } from '../../events/topics';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishActionCandidate(bus: EventBus, candidate: ActionCandidate, producer='decision', correlationId?: string): void {
  const envelope: EventEnvelope<ActionCandidate> = {
    id: (Math.random() * 1e17).toString(36),
    topic: EVENT_TOPICS.DECISION_CANDIDATE,
    timestamp: new Date().toISOString(),
    producer,
    version: '1.0.0',
    correlationId,
    payload: candidate
  };
  bus.publish(EVENT_TOPICS.DECISION_CANDIDATE, envelope);
}
