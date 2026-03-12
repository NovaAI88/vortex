// Basic momentum-based strategy implementation
import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';
import { Strategy } from './strategyInterface';

const strategy: Strategy = {
  generateSignal(state: ProcessedMarketState): TradeSignal | null {
    if (!state) return null;
    const signalType =
      state.price < (state.movingAvg || state.price)
        ? 'buy'
        : state.price > (state.movingAvg || state.price)
        ? 'sell'
        : 'hold';
    return {
      source: 'basic-momentum',
      symbol: state.symbol,
      signalType,
      confidence: 0.7,
      rationale: 'Basic momentum: price vs movingAvg',
      timestamp: new Date().toISOString(),
      baseState: state
    };
  }
};
export default strategy;
