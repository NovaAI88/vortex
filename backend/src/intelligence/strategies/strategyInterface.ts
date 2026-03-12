// Strategy Interface for signal generators
import { ProcessedMarketState } from '../../models/ProcessedMarketState';
import { TradeSignal } from '../../models/TradeSignal';

export interface Strategy {
  generateSignal(state: ProcessedMarketState): TradeSignal | null;
}
