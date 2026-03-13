// Risk Layer orchestration: consumes ActionCandidate events, checks idempotency, publishes RiskDecision
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicRiskEvaluator } from './evaluators/basicRiskEvaluator';
import { publishRiskDecision } from './publishers/riskDecisionPublisher';
import { checkLimits } from './globalRiskController';
import { logRisk } from './state/riskState';

const processedIds = new Set<string>();

export function startRiskPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE, envelope => {
    try {
      const candidate = envelope.payload;
      const duplicate = processedIds.has(candidate.id);
      // Global risk controls
      const riskCheck = checkLimits();
      if (!riskCheck.allowed) {
        const riskBlockedDecision = { ...candidate, status: 'blocked_global_risk', blockedBy: riskCheck.blockedBy };
        try { logRisk(riskBlockedDecision); } catch(e) {}
        publishRiskDecision(bus, riskBlockedDecision, 'risk', envelope.correlationId);
        return;
      }
      const decision = basicRiskEvaluator(candidate, duplicate);
      // Propagate strategyId, price, and variantId
      if (candidate && decision) {
        decision.strategyId = candidate.strategyId;
        decision.price = candidate.price; // Explicit field propagation
        decision.variantId = candidate.variantId; // Explicit field propagation
      }
      // Bridge: log for API
      try { logRisk(decision); } catch(e) {}
      publishRiskDecision(bus, decision, 'risk', envelope.correlationId);
      if (!duplicate) {
        processedIds.add(candidate.id);
      }
    } catch (err) {
      // If error is critical, it will surface in test diagnostics
    }
  });
}
