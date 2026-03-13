// Execution Layer orchestration: only approved RiskDecision, dedup, mockExec, publish
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { mockExchangeAdapter } from './adapters/mockExchangeAdapter';
import { publishExecutionResult } from './publishers/executionResultPublisher';
import { ExecutionRequest } from '../models/ExecutionRequest';
import { getEngineMode, EngineMode } from './mode/executionMode';
import { logExecution } from './executionLog';
import { recordExecution } from '../portfolio/state/portfolioLedger';

const processedRiskDecisionIds = new Set<string>();

export function startExecutionPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.RISK_DECISION, envelope => {
    const decision = envelope.payload;
    if (!decision.approved) return; // gate: only process approved
    if (processedRiskDecisionIds.has(decision.id)) return; // dedup gate
    const request: ExecutionRequest = {
      id: (Math.random() * 1e17).toString(36),
      riskDecisionId: decision.id,
      actionCandidateId: decision.actionCandidateId,
      signalId: decision.signalId,
      strategyId: decision.strategyId,
      symbol: decision.symbol || 'BTCUSDT', // fallback, required
      side: decision.side || 'buy', // fallback, required
      price: decision.price, // propagate price (ensure upstream includes price)
      variantId: decision.variantId, // propagate variantId
      producer: 'execution',
      timestamp: new Date().toISOString()
    };
    // Mode gating logic
    const mode = getEngineMode();
    if (mode === EngineMode.OFF) {
      // Drop execution request
      return;
    }
    let result = null;
    if (mode === EngineMode.PAPER_TRADING) {
      result = mockExchangeAdapter(request);
    } else if (mode === EngineMode.LIVE_TRADING) {
      // LIVE_TRADING not implemented yet
      result = {
        ...request,
        status: 'not_implemented',
        reason: 'LIVE_TRADING not implemented',
        adapter: 'none',
        timestamp: new Date().toISOString()
      };
    }
    if (result) {
      try {
        logExecution(result);
      } catch (e) {}
      // Stage 8: forward to portfolio ledger in PAPER_TRADING only
      try {
        if (getEngineMode() === EngineMode.PAPER_TRADING) {
          recordExecution(result);
        }
      } catch(e) {}
      publishExecutionResult(bus, result, 'execution', envelope.correlationId);
    }
    processedRiskDecisionIds.add(decision.id);
  });
}
