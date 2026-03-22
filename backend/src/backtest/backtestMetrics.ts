// VORTEX — Backtest Metrics (Phase 5)
//
// Computes all performance metrics from a completed trade list and equity curve.
//
// Metrics computed:
//   totalReturn, winRate, avgWin, avgLoss, expectancy, profitFactor,
//   maxDrawdown, sharpeRatio, avgR, expectancyR
//
// Plus breakdowns by: regime, strategyId, exitSource
//
// Sharpe ratio:
//   Computed from per-candle equity returns (not per-trade).
//   Annualised by multiplying by sqrt(candles_per_year).
//   For 1m candles: sqrt(525600), 5m: sqrt(105120), 15m: sqrt(35040).
//   If insufficient data points for std dev, returns 0.

import {
  BacktestTrade,
  BacktestResult,
  BacktestConfig,
  StrategyMetrics,
  RegimeBreakdown,
  StrategyBreakdown,
  ExitModeBreakdown,
  ExitSource,
} from './backtestTypes';

// ─── Public API ────────────────────────────────────────────────────────────

export function computeBacktestMetrics(
  trades:      BacktestTrade[],
  equityCurve: number[],
  config:      BacktestConfig,
  runId:       string,
  startTime:   string,
  endTime:     string,
  durationMs:  number,
): BacktestResult {
  const initialCapital = config.initialCapital;
  const finalEquity    = equityCurve.length > 0
    ? equityCurve[equityCurve.length - 1]
    : initialCapital;

  const totalReturn = initialCapital > 0
    ? ((finalEquity - initialCapital) / initialCapital) * 100
    : 0;

  const maxDrawdown  = computeMaxDrawdownPct(equityCurve);
  const sharpeRatio  = computeSharpeRatio(equityCurve, config.interval);

  const summary      = computeStrategyMetrics(trades);
  const byRegime     = computeByRegime(trades);
  const byStrategy   = computeByStrategy(trades);
  const byExitMode   = computeByExitMode(trades);

  return {
    runId,
    config,
    startTime,
    endTime,
    durationMs,
    candlesUsed: equityCurve.length,

    initialCapital,
    finalEquity:  Number(finalEquity.toFixed(2)),
    totalReturn:  Number(totalReturn.toFixed(4)),
    maxDrawdown:  Number(maxDrawdown.toFixed(4)),
    sharpeRatio:  Number(sharpeRatio.toFixed(4)),

    summary,
    equityCurve,
    trades,

    byRegime,
    byStrategy,
    byExitMode,
  };
}

// ─── Core metric computation ───────────────────────────────────────────────

export function computeStrategyMetrics(trades: BacktestTrade[]): StrategyMetrics {
  const total  = trades.length;
  if (total === 0) {
    return {
      totalTrades: 0, wins: 0, losses: 0,
      winRate: 0, totalPnL: 0,
      avgWin: 0, avgLoss: 0, expectancy: 0, profitFactor: 0,
      avgR: 0, expectancyR: 0,
    };
  }

  const wins   = trades.filter(t => t.isWin);
  const losses = trades.filter(t => !t.isWin);

  const totalPnL    = trades.reduce((s, t) => s + t.pnl, 0);
  const grossWins   = wins.reduce((s, t)   => s + t.pnl, 0);
  const grossLosses = losses.reduce((s, t) => s + Math.abs(t.pnl), 0);

  const winRate  = (wins.length / total) * 100;
  const lossRate = 100 - winRate;

  const avgWin  = wins.length   > 0 ? grossWins   / wins.length   : 0;
  const avgLoss = losses.length > 0 ? grossLosses / losses.length : 0;

  // Expectancy in USD
  const expectancy = (winRate / 100) * avgWin - (lossRate / 100) * avgLoss;

  // Profit factor
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : (grossWins > 0 ? Infinity : 0);

  // R-multiple metrics
  const winsR   = wins.map(t   => t.realizedR);
  const lossesR = losses.map(t => t.realizedR);

  const avgR = total > 0
    ? trades.reduce((s, t) => s + t.realizedR, 0) / total
    : 0;

  const avgWinR  = winsR.length   > 0 ? winsR.reduce((s, r)   => s + r, 0) / winsR.length   : 0;
  const avgLossR = lossesR.length > 0 ? lossesR.reduce((s, r) => s + Math.abs(r), 0) / lossesR.length : 0;

  // Expectancy in R-multiples
  const expectancyR = (winRate / 100) * avgWinR - (lossRate / 100) * avgLossR;

  return {
    totalTrades:  total,
    wins:         wins.length,
    losses:       losses.length,
    winRate:      Number(winRate.toFixed(2)),
    totalPnL:     Number(totalPnL.toFixed(4)),
    avgWin:       Number(avgWin.toFixed(4)),
    avgLoss:      Number(avgLoss.toFixed(4)),
    expectancy:   Number(expectancy.toFixed(4)),
    profitFactor: Number((profitFactor === Infinity ? 999 : profitFactor).toFixed(4)),
    avgR:         Number(avgR.toFixed(4)),
    expectancyR:  Number(expectancyR.toFixed(4)),
  };
}

// ─── Breakdown helpers ─────────────────────────────────────────────────────

function computeByRegime(trades: BacktestTrade[]): RegimeBreakdown[] {
  const regimes = [...new Set(trades.map(t => t.regime))].sort();
  return regimes.map(regime => ({
    regime,
    metrics: computeStrategyMetrics(trades.filter(t => t.regime === regime)),
  }));
}

function computeByStrategy(trades: BacktestTrade[]): StrategyBreakdown[] {
  const strategies = [...new Set(trades.map(t => t.strategyId))].sort();
  return strategies.map(strategyId => ({
    strategyId,
    metrics: computeStrategyMetrics(trades.filter(t => t.strategyId === strategyId)),
  }));
}

function computeByExitMode(trades: BacktestTrade[]): ExitModeBreakdown[] {
  const modes = [...new Set(trades.map(t => t.exitSource))].sort() as ExitSource[];
  return modes.map(exitSource => ({
    exitSource,
    metrics: computeStrategyMetrics(trades.filter(t => t.exitSource === exitSource)),
  }));
}

// ─── Max drawdown ──────────────────────────────────────────────────────────

function computeMaxDrawdownPct(equityCurve: number[]): number {
  if (equityCurve.length === 0) return 0;

  let peak        = equityCurve[0];
  let maxDrawdown = 0;

  for (const equity of equityCurve) {
    if (equity > peak) peak = equity;
    if (peak > 0) {
      const dd = ((peak - equity) / peak) * 100;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }
  }

  return maxDrawdown;
}

// ─── Sharpe ratio ──────────────────────────────────────────────────────────
// Uses per-candle log returns from the equity curve.
// Annualised by the number of candles per year for the given interval.

const CANDLES_PER_YEAR: Record<string, number> = {
  '1m':  525_600,
  '5m':  105_120,
  '15m':  35_040,
};

function computeSharpeRatio(equityCurve: number[], interval: string): number {
  if (equityCurve.length < 3) return 0;

  // Log returns between consecutive equity values
  const returns: number[] = [];
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1];
    const curr = equityCurve[i];
    if (prev > 0) {
      returns.push(Math.log(curr / prev));
    }
  }

  if (returns.length < 2) return 0;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) return 0;

  const annualisationFactor = Math.sqrt(CANDLES_PER_YEAR[interval] ?? CANDLES_PER_YEAR['1m']);
  const sharpe = (mean / stdDev) * annualisationFactor;

  // Clamp to reasonable range
  return Math.max(-10, Math.min(10, sharpe));
}
