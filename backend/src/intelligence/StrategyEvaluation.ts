// StrategyEvaluation.ts
// Canonical structure for strategy evaluation results

export interface StrategyEvaluation {
  strategyId: string;
  variantId: string;
  sharpe: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  winRate: number;
  score: number;
}
