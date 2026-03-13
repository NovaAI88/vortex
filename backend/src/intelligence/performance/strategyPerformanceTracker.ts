// Strategy performance metrics tracker
// Strategy performance metrics tracker
interface VariantKey {
  strategyId: string;
  variantId?: string;
}

interface StrategyVariantStats {
  trades: number;
  wins: number;
  losses: number;
  realizedPnL: number;
  maxDrawdown: number;
  lastEquity: number;
}

// Use {strategyId}:{variantId} as key (strict deterministic keys only)
const variantStats: Record<string, StrategyVariantStats> = {};

import { updateWeights } from '../weighting/strategyWeightEngine';

function makeVariantKey(strategyId: string, variantId?: string) {
  // Strict: only key when both strategyId and variantId are present
  if (!strategyId || !variantId) return null;
  return `${strategyId}:${variantId}`;
}

export function recordTrade(exec: any) {
  if (!exec || !exec.strategyId || !exec.variantId) return;
  // Strict: only record when both strategyId and variantId are present
  const variantKey = makeVariantKey(exec.strategyId, exec.variantId);
  if (!variantKey) return;
  if (!variantStats[variantKey]) variantStats[variantKey] = { trades: 0, wins: 0, losses: 0, realizedPnL: 0, maxDrawdown: 0, lastEquity: 10000 };
  const s = variantStats[variantKey];
  s.trades += 1;
  const pnl = exec.pnl || exec.realizedPnL || 0; // Expect exec to include PnL
  s.realizedPnL += pnl;
  s.lastEquity += pnl;
  if (pnl >= 0) s.wins += 1; else s.losses += 1;
  // Compute drawdown deterministically
  if (s.trades > 1) {
    const previousEquity = s.lastEquity - pnl;
    const drop = previousEquity - s.lastEquity;
    const dd = previousEquity > 0 ? drop / previousEquity : 0;
    if (dd > s.maxDrawdown) s.maxDrawdown = dd;
  }
  updateWeights(getStrategyLevelPerformance());
}

// Aggregate only true variant stats to strategy-level keyed object for weighting
export function getStrategyLevelPerformance() {
  // { [strategyId]: aggregated metrics } for compatibility with weighting engine
  const agg: Record<string, any> = {};
  for (const [rawKey, s] of Object.entries(variantStats)) {
    if (!rawKey.includes(':')) continue;
    const [strategyId, variantId] = rawKey.split(':');
    if (!strategyId || !variantId) continue;
    if (!agg[strategyId]) {
      agg[strategyId] = { trades: 0, wins: 0, losses: 0, realizedPnL: 0, maxDrawdown: 0, lastEquity: 10000 };
    }
    agg[strategyId].trades += s.trades;
    agg[strategyId].wins += s.wins;
    agg[strategyId].losses += s.losses;
    agg[strategyId].realizedPnL += s.realizedPnL;
    agg[strategyId].lastEquity += s.lastEquity - 10000; // sum delta vs base
    if (s.maxDrawdown > agg[strategyId].maxDrawdown) agg[strategyId].maxDrawdown = s.maxDrawdown;
  }
  // Compute winRate, maxDrawdown percent format
  for (const [id, s] of Object.entries(agg)) {
    s.winRate = s.trades ? s.wins / s.trades : 0;
    s.maxDrawdown = Number((s.maxDrawdown * 100).toFixed(2));
    s.lastEquity = Number(s.lastEquity.toFixed(4));
  }
  return agg;
}

export function getVariantPerformance() {
  // Output only true variant-level records: { strategyId, variantId, ... }
  const results = [];
  for (const [rawKey, s] of Object.entries(variantStats)) {
    if (!rawKey.includes(':')) continue; // Only variant records have ':'
    const [strategyId, variantId] = rawKey.split(':');
    if (!strategyId || !variantId) continue;
    results.push({
      strategyId,
      variantId,
      trades: s.trades,
      wins: s.wins,
      losses: s.losses,
      winRate: s.trades ? s.wins / s.trades : 0,
      realizedPnL: s.realizedPnL,
      maxDrawdown: Number((s.maxDrawdown * 100).toFixed(2)), // percent
      lastEquity: Number(s.lastEquity.toFixed(4))
    });
  }
  return results;
}
