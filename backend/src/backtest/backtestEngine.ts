// Minimal deterministic backtest engine for VORTEX
// Uses mock dataset deterministically: buy = +price move, sell = -price move, hold = skip
import { generateSignals } from '../intelligence/strategyRegistry';
import { calculateMetrics } from './backtestMetrics';
import { ProcessedMarketState } from '../models/ProcessedMarketState';

export type BacktestResult = {
  variant: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  maxDrawdown: number;
  equityCurve: number[];
};

export async function runBacktest(
  dataset: ProcessedMarketState[],
  variants: string[]
): Promise<BacktestResult[]> {
  // For each variant, iterate deterministically through price series
  const results: BacktestResult[] = [];

  for (const variant of variants) {
    let trades: any[] = [];
    let equityCurve: number[] = [];
    let pnl = 0;
    let equity = 10000;

    for (let i = 0; i < dataset.length - 1; i++) { // -1 because we use the NEXT state's price
      const state = dataset[i];
      const nextState = dataset[i + 1];
      const signals = generateSignals(state);
      const signal = signals.find(s => s.variantId === variant);
      let trade = null;
      if (signal && signal.signalType === 'buy') {
        const profit = (nextState.price - state.price) * state.volume;
        equity += profit;
        trade = { profit, equity };
        trades.push(trade);
        pnl += profit;
      } else if (signal && signal.signalType === 'sell') {
        const profit = (state.price - nextState.price) * state.volume;
        equity += profit;
        trade = { profit, equity };
        trades.push(trade);
        pnl += profit;
      }
      equityCurve.push(equity);
    }
    // Fill final point in equity curve
    if (equityCurve.length) equityCurve.push(equity);
    const metrics = calculateMetrics(trades, equityCurve);
    results.push({
      variant,
      ...metrics
    });
  }

  return results;
}
