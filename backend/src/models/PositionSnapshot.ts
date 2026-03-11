// Canonical PositionSnapshot - pure internal event-driven model
export interface PositionSnapshot {
  id: string;
  symbol: string;
  qty: number;
  side: 'buy' | 'sell';
  sourceExecutionResultId: string;
  timestamp: string;
}
