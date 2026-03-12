// Strategy registry for AETHER intelligence layer
import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { TradeSignal } from '../models/TradeSignal';
import { Strategy } from './strategies/strategyInterface';

const strategies: Strategy[] = [];

export function registerStrategy(strategy: Strategy) {
  if (!strategies.includes(strategy)) strategies.push(strategy);
}

export function unregisterStrategy(strategy: Strategy) {
  const idx = strategies.indexOf(strategy);
  if (idx !== -1) strategies.splice(idx, 1);
}

export function generateSignals(state: ProcessedMarketState): TradeSignal[] {
  return strategies.map(strategy => {
    try {
      return strategy.generateSignal(state);
    } catch {
      return null;
    }
  }).filter(Boolean) as TradeSignal[];
}

// Register built-in strategies (static import)
import basicMomentum from './strategies/basicMomentumStrategy';
registerStrategy(basicMomentum);
