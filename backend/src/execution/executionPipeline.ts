// Execution Layer orchestration: only approved RiskDecision, dedup, mockExec, publish
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { mockExchangeAdapter } from './adapters/mockExchangeAdapter';
import { publishExecutionResult } from './publishers/executionResultPublisher';
import { ExecutionRequest } from '../models/ExecutionRequest';

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
      symbol: decision.symbol || 'BTCUSDT', // fallback, required
      side: decision.side || 'buy', // fallback, required
      producer: 'execution',
      timestamp: new Date().toISOString()
    };
    const result = mockExchangeAdapter(request);
    publishExecutionResult(bus, result, 'execution', envelope.correlationId);
    processedRiskDecisionIds.add(decision.id);
  });
}
