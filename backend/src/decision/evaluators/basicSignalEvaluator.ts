// Deterministic evaluator: converts TradeSignal → ActionCandidate (intent only)
import { TradeSignal } from '../../models/TradeSignal';
import { ActionCandidate } from '../../models/ActionCandidate';

export function basicSignalEvaluator(signal: TradeSignal): ActionCandidate | null {
  // Minimal filtering: only act if confidence >= 0.7
  if (signal.confidence < 0.7) return null; // ignore weak/noise

  // Only accept buy/sell intent
  if (signal.signalType === 'buy' || signal.signalType === 'sell') {
    return {
      id: (Math.random() * 1e17).toString(36),
      signalId: signal.timestamp + ':' + signal.source,
      symbol: signal.symbol,
      side: signal.signalType as 'buy' | 'sell',
      confidence: signal.confidence,
      rationale: signal.rationale,
      strategy: signal.source,
      timestamp: new Date().toISOString()
    }
  }
  return null;
}
