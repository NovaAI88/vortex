// Decision Layer orchestration: consumes TradeSignal, evaluates, emits ActionCandidate
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { basicSignalEvaluator } from './evaluators/basicSignalEvaluator';
import { publishActionCandidate } from './publishers/actionCandidatePublisher';

export function startDecisionPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, envelope => {
    const signal = envelope.payload;
    const candidate = basicSignalEvaluator(signal);
    if (candidate) {
      publishActionCandidate(bus, candidate, 'decision', envelope.correlationId);
    }
    // otherwise: ignore or audit filtered signal
  });
}
