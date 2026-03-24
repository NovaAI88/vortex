// Deterministic evaluator: converts TradeSignal → ActionCandidate (intent only)
import { TradeSignal } from '../../models/TradeSignal';
import { ActionCandidate } from '../../models/ActionCandidate';

const DUPLICATE_WINDOW_MS = 5000;
const VALIDATION_MODE = process.env.VORTEX_TREND_VALIDATION_MODE === 'true';
const MIN_CONFIDENCE = VALIDATION_MODE ? Number(process.env.VORTEX_VALIDATION_MIN_CONFIDENCE ?? 0.2) : 0.7;
const lastActionByKey = new Map<string, { ts: number; price: number | null }>();

export function basicSignalEvaluator(signal: TradeSignal): ActionCandidate | null {
  // Minimal filtering: only act if confidence >= 0.7
  if (signal.confidence < 0.7) return null; // ignore weak/noise

  // Only accept buy/sell intent
  if (signal.signalType === 'buy' || signal.signalType === 'sell') {
    const side = signal.signalType as 'buy' | 'sell';
    const variantId = typeof signal.variantId === 'string' ? signal.variantId : 'default';
    const strategyId = signal.strategyId || signal.source || 'unknown';
    const price = signal?.baseState && typeof signal.baseState.price === 'number' ? signal.baseState.price : null;
    const dedupKey = `${signal.symbol}|${side}|${strategyId}|${variantId}`;
    const now = Date.now();
    const prev = lastActionByKey.get(dedupKey);

    if (prev && now - prev.ts < DUPLICATE_WINDOW_MS) {
      const nearIdenticalPrice = prev.price === null || price === null || Math.abs(prev.price - price) / Math.max(Math.abs(prev.price), 1) < 0.0005;
      if (nearIdenticalPrice) {
        console.log('[TRACE decision.dedup_blocked]', {
          symbol: signal.symbol,
          side,
          variantId,
          signalId: `${signal.timestamp}:${signal.source}:${variantId}`,
          price,
        });
        return null;
      }
    }

    lastActionByKey.set(dedupKey, { ts: now, price });

    return {
      id: (Math.random() * 1e17).toString(36),
      signalId: `${signal.timestamp}:${signal.source}:${variantId}`,
      symbol: signal.symbol,
      side,
      confidence: signal.confidence,
      rationale: signal.rationale,
      strategy: signal.source,
      timestamp: new Date().toISOString(),
      variantId,
    }
  }
  return null;
}
