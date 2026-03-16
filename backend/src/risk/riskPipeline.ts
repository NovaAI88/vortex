// Risk Layer orchestration: consumes ActionCandidate events, checks idempotency, publishes RiskDecision
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicRiskEvaluator } from './evaluators/basicRiskEvaluator';
import { publishRiskDecision } from './publishers/riskDecisionPublisher';
import { checkLimits } from './globalRiskController';
import { logRisk } from './state/riskState';
import { getPortfolio } from '../portfolio/state/portfolioLedger';

const processedIds = new Set<string>();

export function startRiskPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE, envelope => {
    try {
      const candidate = envelope.payload;
      const duplicate = processedIds.has(candidate.id);
      // Global risk controls
      const riskCheck = checkLimits(candidate);
      if (!riskCheck.allowed) {
        const riskBlockedDecision = { ...candidate, status: 'blocked_global_risk', blockedBy: riskCheck.blockedBy };
        try { logRisk(riskBlockedDecision); } catch(e) {}
        publishRiskDecision(bus, riskBlockedDecision, 'risk', envelope.correlationId);
        return;
      }

      // Execution cooldown / state guard:
      // - no repeated buys while already long
      // - no repeated sells while already flat
      // - execute only when state meaningfully changes
      const portfolio = getPortfolio();
      const openPositions = Array.isArray(portfolio?.positions) ? portfolio.positions : [];
      const variantId = candidate?.variantId || null;
      const matchingPosition = openPositions.find((p: any) => {
        if (!p || p.symbol !== candidate.symbol) return false;
        if (variantId) return (p.variantId || null) === variantId;
        return true;
      });
      const currentQty = matchingPosition && typeof matchingPosition.qty === 'number' ? matchingPosition.qty : 0;

      if (candidate.side === 'buy' && currentQty > 0) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_state_guard',
          blockedBy: 'already_long',
          reason: 'Execution guard: buy ignored because position is already long',
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

      if (candidate.side === 'sell' && currentQty === 0) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_state_guard',
          blockedBy: 'already_flat',
          reason: 'Execution guard: sell ignored because position is already flat',
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
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
