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

import { getWeight } from './weighting/strategyWeightEngine';

export function generateSignals(state: ProcessedMarketState): TradeSignal[] {
  return strategies.map(strategy => {
    try {
      const signal = strategy.generateSignal(state);
      if (signal) {
        const weight = getWeight(signal.strategyId);
        // Adjust confidence by current weight (safe downstream)
        signal.confidence = Math.max(0, Math.min(1, signal.confidence * weight));
        if (!signal.metadata) signal.metadata = {};
        signal.metadata.weight = weight;
      }
      return signal;
    } catch {
      return null;
    }
  }).filter(Boolean) as TradeSignal[];
}

// Register basic built-in strategy and all momentum parameter variants
import basicMomentum from './strategies/basicMomentumStrategy';
import { momentumVariants } from './evolution/strategyEvolver';
registerStrategy(basicMomentum);
momentumVariants.forEach(({strategy}) => registerStrategy(strategy));
