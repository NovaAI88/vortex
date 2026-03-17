// Canonical ExecutionRequest for execution-layer intent, no price/venue/portfolio fields
export interface ExecutionRequest {
  id: string;
  riskDecisionId: string;
  actionCandidateId: string;
  signalId: string;
  strategyId: string;
  symbol: string;
  side: 'buy' | 'sell';
  price?: number; // Optional: execution price propagated from upstream
  qty?: number; // Computed position size
  variantId?: string; // Optional: propagated variant identifier
  stopLoss?: number; // Protective stop level for newly opened/expanded exposure
  takeProfit?: number; // Protective take-profit level for newly opened/expanded exposure
  producer: string;
  timestamp: string;
}
