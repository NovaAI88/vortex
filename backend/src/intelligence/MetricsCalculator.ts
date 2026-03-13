// MetricsCalculator.ts
// Responsible for computing deterministic performance metrics for a strategy/trade history.

export interface Trade {
  entryPrice: number;
  exitPrice: number;
  profit: number;
  returnPct: number;
  duration: number;
  // add other relevant fields if needed
}

export interface PerformanceRecord {
  profit: number;
  drawdown: number;
  // extend as needed
}

export interface Metrics {
  sharpeRatio: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  winRate: number;
}

export class MetricsCalculator {
  // Computes Sharpe Ratio (no risk-free rate, uses mean/stddev of returns)
  static sharpeRatio(trades: Trade[]): number {
    if (!trades.length) return 0;
    const returns = trades.map(t => t.returnPct);
    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    return std === 0 ? 0 : mean / std;
  }

  // Computes Profit Factor (gross profit / gross loss)
  static profitFactor(trades: Trade[]): number {
    const grossProfit = trades.filter(t => t.profit > 0).reduce((sum, t) => sum + t.profit, 0);
    const grossLoss = Math.abs(trades.filter(t => t.profit < 0).reduce((sum, t) => sum + t.profit, 0));
    return grossLoss === 0 ? grossProfit > 0 ? Infinity : 0 : grossProfit / grossLoss;
  }

  // Computes Expectancy = (prob(win) * avgWin) + (prob(loss) * avgLoss)
  static expectancy(trades: Trade[]): number {
    if (!trades.length) return 0;
    const wins = trades.filter(t => t.profit > 0);
    const losses = trades.filter(t => t.profit <= 0);
    const probWin = wins.length / trades.length;
    const probLoss = losses.length / trades.length;
    const avgWin = wins.length ? wins.reduce((sum, t) => sum + t.profit, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((sum, t) => sum + t.profit, 0) / losses.length : 0;
    return (probWin * avgWin) + (probLoss * avgLoss);
  }

  // Computes Max Drawdown (peak-to-trough largest drop)
  static maxDrawdown(trades: Trade[]): number {
    let peak = 0;
    let trough = 0;
    let maxDD = 0;
    let equity = 0;
    for (const t of trades) {
      equity += t.profit;
      if (equity > peak) {
        peak = equity;
        trough = equity;
      }
      if (equity < trough) {
        trough = equity;
        maxDD = Math.max(maxDD, peak - trough);
      }
    }
    return maxDD;
  }

  // Computes Win Rate [% successful trades]
  static winRate(trades: Trade[]): number {
    if (!trades.length) return 0;
    const wins = trades.filter(t => t.profit > 0).length;
    return (wins / trades.length) * 100;
  }

  static calculateAll(trades: Trade[]): Metrics {
    return {
      sharpeRatio: this.sharpeRatio(trades),
      profitFactor: this.profitFactor(trades),
      expectancy: this.expectancy(trades),
      maxDrawdown: this.maxDrawdown(trades),
      winRate: this.winRate(trades),
    };
  }
}
