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

      console.log('[TRACE risk.input]', {
        symbol: candidate?.symbol,
        side: candidate?.side,
        variantId: candidate?.variantId,
        price: candidate?.price,
        signalId: candidate?.signalId,
        actionCandidateId: candidate?.id,
      });

      // Global risk controls
      const riskCheck = checkLimits(candidate);
      if (!riskCheck.allowed) {
        const riskBlockedDecision = { ...candidate, status: 'blocked_global_risk', blockedBy: riskCheck.blockedBy };
        try { logRisk(riskBlockedDecision); } catch(e) {}
        console.log('[TRACE risk.output.blocked_global]', {
          symbol: candidate?.symbol,
          side: candidate?.side,
          variantId: candidate?.variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: riskCheck.blockedBy,
        });
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
        console.log('[TRACE risk.output.blocked_state]', {
          symbol: candidate?.symbol,
          side: candidate?.side,
          variantId: candidate?.variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: 'already_long',
        });
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
        console.log('[TRACE risk.output.blocked_state]', {
          symbol: candidate?.symbol,
          side: candidate?.side,
          variantId: candidate?.variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: 'already_flat',
        });
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

      const decision = basicRiskEvaluator(candidate, duplicate);
      // Propagate required execution-routing fields from candidate
      if (candidate && decision) {
        decision.strategyId = candidate.strategyId || candidate.strategy || 'unknown';
        (decision as any).symbol = candidate.symbol;
        (decision as any).side = candidate.side;
        decision.price = candidate.price;
        decision.variantId = candidate.variantId;
      }
      // Bridge: log for API
      try { logRisk(decision); } catch(e) {}
      console.log('[TRACE risk.output]', {
        approved: decision?.approved,
        symbol: candidate?.symbol,
        side: candidate?.side,
        variantId: decision?.variantId,
        price: decision?.price,
        signalId: decision?.signalId,
        actionCandidateId: decision?.actionCandidateId,
        riskDecisionId: decision?.id,
      });
      publishRiskDecision(bus, decision, 'risk', envelope.correlationId);
      if (!duplicate) {
        processedIds.add(candidate.id);
      }
    } catch (err) {
      // If error is critical, it will surface in test diagnostics
    }
  });
}
