// Coordinates the Processing Layer: subscribes, validates, enriches, publishes
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { isValidMarketEvent } from './validators/marketEventValidator';
import { enrichMarketEvent } from './enrichers/basicEnricher';
import { publishProcessedMarketState } from './publishers/processedStatePublisher';
import { processTick } from '../ingestion/candles/candleAggregator';

export function startProcessingPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.MARKET_EVENT, envelope => {
    const evt = envelope.payload;
    if (isValidMarketEvent(evt)) {
      // Phase 1: feed tick into candle aggregator (side-channel, non-blocking)
      try {
        const tsMs = new Date(evt.timestamp).getTime();
        if (Number.isFinite(tsMs)) processTick(evt.symbol, evt.price, evt.volume, tsMs);
      } catch {}

      const state = enrichMarketEvent(evt);
      // Bridge: update latest order book
      try {
        const { updateOrderBook } = require('./state/orderBookState');
        updateOrderBook({
          bids: [
            { price: String(state.price-5), size: "0.60" },
            { price: String(state.price-10), size: "0.40" }
          ],
          asks: [
            { price: String(state.price+5), size: "0.65" },
            { price: String(state.price+10), size: "1.00" }
          ],
          support: String(Math.floor(state.price - 30)),
          resistance: String(Math.floor(state.price + 30)),
          timestamp: new Date().toISOString()
        });
      } catch(e) { /* silent fallback, just bridges best effort */ }
      publishProcessedMarketState(bus, state, "processing", envelope.correlationId);
    } else {
      // TODO: Log or audit invalid event
    }
  });
}
