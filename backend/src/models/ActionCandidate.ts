// Canonical ActionCandidate intent model - pure intent, no execution params
export interface ActionCandidate {
  id: string;
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  confidence: number;
  rationale: string;
  strategy: string;
  strategyId: string;
  price?: number;    // Optional: execution price as seen at signal/decision time
  variantId?: string; // Optional: variant identifier for attribution
  timestamp: string;
  // Phase 4: passed through to execution for ATR-based exit calculation
  atr14?: number | null;   // ATR14 from signal's baseState
  regime?: string | null;  // AI regime from signal's baseState context
}
