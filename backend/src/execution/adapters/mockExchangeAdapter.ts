// Mock exchange adapter: simulates execution, no real order
import { ExecutionRequest } from '../../models/ExecutionRequest';
import { ExecutionResult } from '../../models/ExecutionResult';

export function mockExchangeAdapter(request: ExecutionRequest): ExecutionResult {
  return {
    id: (Math.random() * 1e17).toString(36),
    executionRequestId: request.id,
    riskDecisionId: request.riskDecisionId,
    actionCandidateId: request.actionCandidateId,
    signalId: request.signalId,
    strategyId: request.strategyId,
    symbol: request.symbol,
    side: request.side,
    price: request.price, // propagate from request, do not invent a price
    qty: request.qty,
    variantId: request.variantId, // propagate variantId through
    stopLoss: request.stopLoss,
    takeProfit: request.takeProfit,
    status: 'simulated',
    reason: 'Simulated execution success',
    adapter: 'mockExchangeAdapter',
    timestamp: new Date().toISOString(),
  };
}
