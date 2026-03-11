// Publishes ExecutionResult to execution.result topic (event bus)
import { EventBus } from '../../events/eventBus';
import { ExecutionResult } from '../../models/ExecutionResult';
import { EVENT_TOPICS } from '../../events/topics';
import { EventEnvelope } from '../../events/eventEnvelope';

export function publishExecutionResult(bus: EventBus, result: ExecutionResult, producer='execution', correlationId?: string): void {
  const envelope: EventEnvelope<ExecutionResult> = {
    id: (Math.random() * 1e17).toString(36),
    topic: EVENT_TOPICS.EXECUTION_RESULT,
    timestamp: new Date().toISOString(),
    producer,
    version: '1.0.0',
    correlationId,
    payload: result
  };
  bus.publish(EVENT_TOPICS.EXECUTION_RESULT, envelope);
}
