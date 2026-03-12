// Minimal enrichment for ProcessedMarketState from MarketEvent
import { MarketEvent } from '../../models/MarketEvent';
import { ProcessedMarketState } from '../../models/ProcessedMarketState';

const _mockPrices: number[] = [];
const ROLLING_WINDOW = 7;

export function enrichMarketEvent(evt: MarketEvent): ProcessedMarketState {
  let movingAvg: number;
  // Also permit mock-origin flagged Binance-shaped events
  if ((evt.exchange === 'MOCK' || evt.exchange === 'MOCK_EXCHANGE' || evt.exchange == null || evt.raw?.mock)) {
    // Rolling avg (mock mode only)
    _mockPrices.push(evt.price);
    if (_mockPrices.length > ROLLING_WINDOW) _mockPrices.shift();
    movingAvg = _mockPrices.reduce((a, b) => a + b, 0) / _mockPrices.length;
  } else {
    movingAvg = Number(evt.raw?.movingAvg ?? evt.price);
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
