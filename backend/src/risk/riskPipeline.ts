// Risk Layer orchestration: consumes ActionCandidate events, checks idempotency, publishes RiskDecision
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicRiskEvaluator } from './evaluators/basicRiskEvaluator';
import { publishRiskDecision } from './publishers/riskDecisionPublisher';

const processedIds = new Set<string>();

export function startRiskPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE, envelope => {
    const candidate = envelope.payload;
    const duplicate = processedIds.has(candidate.id);
    const decision = basicRiskEvaluator(candidate, duplicate);
    // Bridge: log for API
    try { require('./state/riskState').logRisk(decision); } catch(e) {}
    publishRiskDecision(bus, decision, 'risk', envelope.correlationId);
    if (!duplicate) {
      processedIds.add(candidate.id);
    }
  });
}
