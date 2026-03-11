// Adapter for transforming mock raw payload to canonical MarketEvent
import { MarketEvent } from '../../models/MarketEvent';

export function adaptMockPayloadToMarketEvent(raw: any): MarketEvent {
  return {
    exchange: raw.exchange,
    symbol: raw.symbol,
    eventType: raw.eventType,
    price: Number(raw.price),
    volume: Number(raw.volume),
    timestamp: raw.timestamp,
    raw: raw // retain raw for audit
  };
}
