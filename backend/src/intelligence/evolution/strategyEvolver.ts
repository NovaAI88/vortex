// Static set of momentum strategy variants
import { Strategy } from '../strategies/strategyInterface';
import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';

export interface MomentumParams {
  window: number; // e.g. lookback window for signal
  threshold: number; // e.g. for trend/mom signal
  variantId: string;
}

function makeMomentumVariant(params: MomentumParams): Strategy {
  return {
    generateSignal(state: ProcessedMarketState): TradeSignal | null {
      if (!state) return null;
      // For demo, use threshold/window
      // In practice, would accumulate recent states by symbol
      let decision = 'hold';
      if (state.price < (state.movingAvg || state.price) - params.threshold) decision = 'buy';
      else if (state.price > (state.movingAvg || state.price) + params.threshold) decision = 'sell';
      return {
        source: 'momentum-evolve',
        symbol: state.symbol,
        signalType: decision,
        confidence: 0.7,
        rationale: `window=${params.window}, th=${params.threshold}`,
        timestamp: new Date().toISOString(),
        strategyId: 'momentum',
        variantId: params.variantId,
        baseState: state,
        metadata: { params }
      };
    }
  };
}

export const momentumVariants: {strategy: Strategy, params: MomentumParams}[] = [
  {strategy: makeMomentumVariant({window:5,threshold:10,variantId: 'v5t10'}), params: {window:5,threshold:10,variantId:'v5t10'}},
  {strategy: makeMomentumVariant({window:10,threshold:7,variantId: 'v10t7'}), params: {window:10,threshold:7,variantId:'v10t7'}},
  {strategy: makeMomentumVariant({window:15,threshold:5,variantId: 'v15t5'}), params: {window:15,threshold:5,variantId:'v15t5'}},
];
