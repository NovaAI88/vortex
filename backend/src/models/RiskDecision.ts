// Canonical RiskDecision model (approval/rejection only, audit-friendly)
export interface RiskDecision {
  id: string;
  actionCandidateId: string;
  signalId: string;
  strategyId: string;
  price?: number; // Optional: propagated execution price
  variantId?: string; // Optional: propagated variant identifier
  stopLoss?: number; // Optional protective stop propagated downstream
  takeProfit?: number; // Optional protective take-profit propagated downstream
  approved: boolean;
  reason: string;
  producer: string;
  timestamp: string;
  policyName?: string;
}
