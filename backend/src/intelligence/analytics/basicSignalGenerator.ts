// Deterministic minimal signal generator
import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';

export function basicSignalGenerator(state: ProcessedMarketState): TradeSignal {
  // Example rule: BUY if price < moving average
  return {
    source: 'basic-signal',
    symbol: state.symbol,
    signalType: state.price < (state.movingAvg || state.price) ? 'buy' : 'hold',
    confidence: 0.7,
    rationale: 'Simple rule: price < movingAvg',
    timestamp: new Date().toISOString(),
    baseState: state
  };
}
