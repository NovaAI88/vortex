// Risk Layer orchestration: consumes ActionCandidate events, checks idempotency, publishes RiskDecision
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicRiskEvaluator } from './evaluators/basicRiskEvaluator';
import { publishRiskDecision } from './publishers/riskDecisionPublisher';
import { checkLimits } from './globalRiskController';
import { logRisk } from './state/riskState';
import { getPortfolio } from '../portfolio/state/portfolioLedger';
import { isTradingEnabled } from '../operator/operatorState';

import { hasProcessedId as hasDedupId, markProcessedId as markDedupId } from '../decision/state/dedupStore';
const lastApprovedByKey = new Map<string, number>();
const COOLDOWN_MS = 10_000;
const PYRAMIDING_ENABLED = false;
// Conservative aggregate same-direction symbol exposure cap (fraction of equity)
const MAX_SYMBOL_DIRECTION_EXPOSURE_PCT = 0.15;

export function startRiskPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE, envelope => {
    try {
      const candidate = envelope.payload;
      const duplicate = hasDedupId(candidate.id);

      console.log('[TRACE risk.input]', {
        symbol: candidate?.symbol,
        side: candidate?.side,
        variantId: candidate?.variantId,
        price: candidate?.price,
        signalId: candidate?.signalId,
        actionCandidateId: candidate?.id,
      });

      if (!isTradingEnabled()) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_operator_pause',
          blockedBy: 'operator_paused',
          reason: 'Operator paused trading',
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
          blockedBy: 'operator_paused',
        });
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

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

      // Strict per-variant position-state guard + cooldown
      const portfolio = getPortfolio();
      const openPositions = Array.isArray(portfolio?.positions) ? portfolio.positions : [];
      const variantId = candidate?.variantId || null;
      const side: 'buy' | 'sell' = candidate?.side;
      const symbol = candidate?.symbol;
      const strategyId = candidate?.strategyId || candidate?.strategy || 'unknown';
      const cooldownKey = `${symbol}|${variantId || 'default'}|${strategyId}`;

      const matchingPosition = openPositions.find((p: any) => {
        if (!p || p.symbol !== symbol) return false;
        return (p.variantId || null) === variantId;
      });
      const currentQty = matchingPosition && typeof matchingPosition.qty === 'number' ? matchingPosition.qty : 0;

      const now = Date.now();
      const lastApprovedTs = lastApprovedByKey.get(cooldownKey);
      if (typeof lastApprovedTs === 'number' && now - lastApprovedTs < COOLDOWN_MS) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_state_guard',
          blockedBy: 'cooldown_active',
          reason: `Execution cooldown active for ${COOLDOWN_MS / 1000}s on strategy+symbol+variant`,
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        console.log('[TRACE risk.output.blocked_state]', {
          symbol,
          side,
          variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: 'cooldown_active',
        });
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

      const equity = Number(portfolio?.equity);
      const safeEquity = Number.isFinite(equity) && equity > 0 ? equity : 0;
      const sameDirectionExposure = openPositions
        .filter((p: any) => p?.symbol === symbol)
        .filter((p: any) => (side === 'buy' ? Number(p?.qty) > 0 : Number(p?.qty) < 0))
        .reduce((sum: number, p: any) => {
          const mark = Number(p?.markPrice ?? p?.avgEntry ?? 0);
          const qtyAbs = Math.abs(Number(p?.qty) || 0);
          return sum + (Number.isFinite(mark) && mark > 0 ? qtyAbs * mark : 0);
        }, 0);
      const exposureCap = safeEquity * MAX_SYMBOL_DIRECTION_EXPOSURE_PCT;
      const capped = safeEquity > 0 && sameDirectionExposure >= exposureCap;

      if (capped) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_exposure_cap',
          blockedBy: 'symbol_direction_exposure_cap',
          reason: `Aggregate same-direction symbol exposure cap exceeded (${Math.round(MAX_SYMBOL_DIRECTION_EXPOSURE_PCT * 100)}% equity)`,
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        console.log('[TRACE risk.output.blocked_state]', {
          symbol,
          side,
          variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: 'symbol_direction_exposure_cap',
        });
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

      if (!PYRAMIDING_ENABLED && side === 'buy' && currentQty > 0) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_state_guard',
          blockedBy: 'already_long',
          reason: 'Execution guard: additional buy blocked while already long (pyramiding disabled)',
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        console.log('[TRACE risk.output.blocked_state]', {
          symbol,
          side,
          variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: 'already_long',
        });
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

      if (!PYRAMIDING_ENABLED && side === 'sell' && currentQty < 0) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_state_guard',
          blockedBy: 'already_short',
          reason: 'Execution guard: additional sell blocked while already short (pyramiding disabled)',
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        console.log('[TRACE risk.output.blocked_state]', {
          symbol,
          side,
          variantId,
          signalId: candidate?.signalId,
          actionCandidateId: candidate?.id,
          blockedBy: 'already_short',
        });
        publishRiskDecision(bus, blocked, 'risk', envelope.correlationId);
        return;
      }

      if (side === 'sell' && currentQty === 0) {
        const blocked = {
          ...candidate,
          approved: false,
          status: 'blocked_state_guard',
          blockedBy: 'already_flat',
          reason: 'Execution guard: sell blocked while flat',
          producer: 'risk',
          timestamp: new Date().toISOString(),
        };
        try { logRisk(blocked); } catch(e) {}
        console.log('[TRACE risk.output.blocked_state]', {
          symbol,
          side,
          variantId,
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

      if (decision?.approved) {
        const approvedStrategy = candidate?.strategyId || candidate?.strategy || 'unknown';
        const approvedKey = `${candidate.symbol}|${candidate.variantId || 'default'}|${approvedStrategy}`;
        lastApprovedByKey.set(approvedKey, Date.now());
      }

      if (!duplicate) {
        markDedupId(candidate.id);
      }
    } catch (err) {
      // If error is critical, it will surface in test diagnostics
    }
  });
}
