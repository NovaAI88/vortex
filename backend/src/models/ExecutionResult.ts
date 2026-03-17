// Canonical ExecutionResult model (operational outcome)
export interface ExecutionResult {
  id: string;
  executionRequestId: string;
  riskDecisionId: string;
  actionCandidateId: string;
  symbol: string;
  side: 'buy' | 'sell';
  signalId: string;
  strategyId: string;
  price?: number; // Optional: propagated price of execution
  qty?: number; // Propagated position size
  variantId?: string; // Optional: propagated variant identifier
  stopLoss?: number; // Protective stop level applied on execution
  takeProfit?: number; // Protective take-profit level applied on execution
  status: 'simulated' | 'rejected' | 'failed';
  reason: string;
  adapter: string;
  timestamp: string;
}
