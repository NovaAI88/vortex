// Minimal enrichment for ProcessedMarketState from MarketEvent
import { MarketEvent } from '../../models/MarketEvent';
import { ProcessedMarketState } from '../../models/ProcessedMarketState';

const _prices: number[] = [];
const ROLLING_WINDOW = 7;

export function enrichMarketEvent(evt: MarketEvent): ProcessedMarketState {
  let movingAvg: number;

  // Shared rolling average for all events
  _prices.push(evt.price);
  if (_prices.length > ROLLING_WINDOW) _prices.shift();
  movingAvg = _prices.reduce((a, b) => a + b, 0) / _prices.length;

  // Override with provided movingAvg if available (for future live sources)
  if (evt.raw?.movingAvg) {
    movingAvg = Number(evt.raw.movingAvg);
  }
  return {
    exchange: evt.exchange,
    symbol: evt.symbol,
    eventType: evt.eventType,
    price: evt.price,
    volume: evt.volume,
    timestamp: evt.timestamp,
    movingAvg,
    enriched: true,
    baseEvent: evt,
  };
}
