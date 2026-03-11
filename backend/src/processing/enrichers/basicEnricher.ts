// Minimal enrichment for ProcessedMarketState from MarketEvent
import { MarketEvent } from '../../models/MarketEvent';
import { ProcessedMarketState } from '../../models/ProcessedMarketState';

export function enrichMarketEvent(evt: MarketEvent): ProcessedMarketState {
  return {
    exchange: evt.exchange,
    symbol: evt.symbol,
    eventType: evt.eventType,
    price: evt.price,
    volume: evt.volume,
    timestamp: evt.timestamp,
    movingAvg: evt.price, // minimal, placeholder
    enriched: true,
    baseEvent: evt,
  };
}
