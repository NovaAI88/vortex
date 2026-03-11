// Coordinates the Processing Layer: subscribes, validates, enriches, publishes
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { isValidMarketEvent } from './validators/marketEventValidator';
import { enrichMarketEvent } from './enrichers/basicEnricher';
import { publishProcessedMarketState } from './publishers/processedStatePublisher';

export function startProcessingPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.MARKET_EVENT, envelope => {
    const evt = envelope.payload;
    if (isValidMarketEvent(evt)) {
      const state = enrichMarketEvent(evt);
      publishProcessedMarketState(bus, state, "processing", envelope.correlationId);
    } else {
      // TODO: Log or audit invalid event
    }
  });
}
