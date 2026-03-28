// Strategy registry for VORTEX intelligence layer
import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { TradeSignal } from '../models/TradeSignal';
import { getWeight } from './weighting/strategyWeightEngine';
import { generateMomentumSignal, MomentumVariantParams } from './strategies/basicMomentumStrategy';

// Stage 16: Hardcoded deterministic list of momentum variants only
const momentumVariants: MomentumVariantParams[] = [
  {variantId: 'v1', window: 5, threshold: 8},
  {variantId: 'v2', window: 10, threshold: 5},
  {variantId: 'v3', window: 15, threshold: 3},
];

export function generateSignals(state: ProcessedMarketState): TradeSignal[] {
  const signals: TradeSignal[] = momentumVariants.map(params => generateMomentumSignal(state, params)).filter(Boolean) as TradeSignal[];
  for (const signal of signals) {
    const weight = getWeight(signal.strategyId);
    signal.confidence = Math.max(0, Math.min(1, signal.confidence * weight));
    if (!signal.metadata) signal.metadata = {};
    signal.metadata.weight = weight;
  }
  return signals;
}
