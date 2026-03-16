// Decision Layer orchestration: consumes TradeSignal, evaluates, emits ActionCandidate
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicSignalEvaluator } from './evaluators/basicSignalEvaluator';
import { publishActionCandidate } from './publishers/actionCandidatePublisher';

export function startDecisionPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, envelope => {
    const signal = envelope.payload ?? envelope;
    console.log('[TRACE decision.input]', {
      symbol: signal?.symbol,
      side: signal?.signalType,
      variantId: signal?.variantId,
      price: signal?.baseState?.price,
      signalId: `${signal?.timestamp}:${signal?.source}:${signal?.variantId || 'default'}`,
    });

    const candidate = basicSignalEvaluator(signal);
    // Propagate strategyId, price, and variantId from signal
    if (signal && candidate) {
      candidate.strategyId = signal.strategyId || signal.source || 'unknown';
      candidate.price = signal.baseState && typeof signal.baseState.price === 'number' ? signal.baseState.price : undefined; // Safe extraction
      if ('variantId' in signal && typeof signal.variantId === 'string') candidate.variantId = signal.variantId;
    }
    // Bridge: log for API
    try { require('./state/decisionState').logDecision(candidate); } catch(e) {}
    if (candidate) {
      console.log('[TRACE decision.output]', {
        symbol: candidate.symbol,
        side: candidate.side,
        variantId: candidate.variantId,
        price: candidate.price,
        signalId: candidate.signalId,
        actionCandidateId: candidate.id,
      });
      publishActionCandidate(bus, candidate, 'decision', envelope.correlationId);
    }
    // otherwise: ignore or audit filtered signal
  });
}
