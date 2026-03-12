// Strategy performance metrics tracker
interface StrategyStats {
  trades: number;
  wins: number;
  losses: number;
  realizedPnL: number;
  maxDrawdown: number;
  lastEquity: number;
}

// Use {strategyId}:{variantId} as key
const stats: Record<string, StrategyStats> = {};

import { updateWeights } from '../weighting/strategyWeightEngine';

export function recordTrade(exec: any) {
  if (!exec || !exec.strategyId) return;
  // Support variant-level attribution
  const variantKey = exec.variantId ? `${exec.strategyId}:${exec.variantId}` : exec.strategyId;
  if (!stats[variantKey]) stats[variantKey] = { trades: 0, wins: 0, losses: 0, realizedPnL: 0, maxDrawdown: 0, lastEquity: 10000 };
  const s = stats[variantKey];
  s.trades += 1;
  const pnl = exec.pnl || exec.realizedPnL || 0; // Expect exec to include PnL
  s.realizedPnL += pnl;
  s.lastEquity += pnl;
  if (pnl >= 0) s.wins += 1; else s.losses += 1;
  if (s.lastEquity < (s.lastEquity - pnl)) {
    const dd = ((s.lastEquity - pnl) - s.lastEquity) / (s.lastEquity - pnl);
    if (dd > s.maxDrawdown) s.maxDrawdown = dd;
  }
  updateWeights(getStrategyPerformance());
}

export function getStrategyPerformance() {
  // Compute win rate dynamically for weighting, safe default
  const view: Record<string, any> = {};
  for (const [id, s] of Object.entries(stats)) {
    view[id] = {
      ...s,
      winRate: s.trades ? s.wins / s.trades : 0,
      maxDrawdown: Number((s.maxDrawdown * 100).toFixed(2)) // percent
    };
  }
  return view;
}
