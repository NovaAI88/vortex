// signalState: capped in-memory log for signals
import { TradeSignal } from '../../models/TradeSignal';
const MAX_SIGNALS = 20;
const signals: TradeSignal[] = [];
export function logSignal(signal: TradeSignal) {
  signals.push(signal);
  while (signals.length > MAX_SIGNALS) signals.shift();
}
export function getRecentSignals(): TradeSignal[] {
  return signals.slice(-MAX_SIGNALS).reverse();
}
