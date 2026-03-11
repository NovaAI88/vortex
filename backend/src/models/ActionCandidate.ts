// Canonical ActionCandidate intent model - pure intent, no execution params
export interface ActionCandidate {
  id: string;
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  confidence: number;
  rationale: string;
  strategy: string;
  timestamp: string;
}
