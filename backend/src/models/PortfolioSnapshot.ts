// Canonical PortfolioSnapshot model (no advanced calculation or persistence)
export interface PortfolioSnapshot {
  id: string;
  equity: number;
  openPositions: string[];
  lastExecutionResultId: string;
  timestamp: string;
}
