// Mock data source connector for VORTEX ingestion pipeline
import { MarketEvent } from '../../models/MarketEvent';

export function getMockRawPayload() {
  const now = Date.now();
  return {
    e: 'trade', // eventType
    E: now, // event time (optional, not used)
    s: 'BTCUSDT', // symbol
    p: (10000 + Math.random() * 2000).toFixed(2), // price
    q: (Math.random() * 0.5).toFixed(3), // quantity
    T: now, // trade time in ms
    mock: true, // marker for downstream mock mode
    // For reference, Binance payload: https://binance-docs.github.io/apidocs/spot/en/#trade-streams
  };
}
