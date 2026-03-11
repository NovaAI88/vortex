// Canonical ExecutionRequest for execution-layer intent, no price/venue/portfolio fields
export interface ExecutionRequest {
  id: string;
  riskDecisionId: string;
  actionCandidateId: string;
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  producer: string;
  timestamp: string;
}
