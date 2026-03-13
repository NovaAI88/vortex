// StrategyEvaluator.ts
// Evaluates a single strategy variant with given performance history

import { MetricsCalculator, Trade } from './MetricsCalculator';
import { StrategyEvaluation } from './StrategyEvaluation';

export class StrategyEvaluator {
  static evaluate(
    strategyId: string,
    variantId: string,
    trades: Trade[]
  ): StrategyEvaluation {
    const metrics = MetricsCalculator.calculateAll(trades);
    // Simple composite score: weighted average (Sharpe 30%, Profit Factor 25%, Expectancy 25%, WinRate 15%, Max Drawdown -15%)
    // Scale maxDrawdown as negative (penalty)
    const score = (metrics.sharpeRatio * 0.3)
      + (Math.min(metrics.profitFactor, 10) * 0.25) // cap PF at 10
      + (metrics.expectancy * 0.25)
      + ((metrics.winRate / 100) * 0.15)
      - (metrics.maxDrawdown * 0.15);
    return {
      strategyId,
      variantId,
      sharpe: metrics.sharpeRatio,
      profitFactor: metrics.profitFactor,
      expectancy: metrics.expectancy,
      maxDrawdown: metrics.maxDrawdown,
      winRate: metrics.winRate,
      score,
    };
  }
}
