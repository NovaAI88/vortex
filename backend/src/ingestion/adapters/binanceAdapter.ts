// Adapter for Binance raw payload to canonical MarketEvent
import { MarketEvent } from '../../models/MarketEvent';

export function adaptBinanceTradeToMarketEvent(raw: any): MarketEvent {
  // Binance trade stream: https://binance-docs.github.io/apidocs/spot/en/#trade-streams
  return {
    exchange: 'BINANCE',
    symbol: raw.s,
    eventType: raw.e,
    price: Number(raw.p),
    volume: Number(raw.q),
    timestamp: new Date(raw.T).toISOString(),
    raw
  };
}
