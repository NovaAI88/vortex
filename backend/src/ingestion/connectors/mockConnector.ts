// Mock data source connector for AETHER ingestion pipeline
import { MarketEvent } from '../../models/MarketEvent';

export function getMockRawPayload() {
  return {
    exchange: 'MOCK',
    symbol: 'BTCUSDT',
    eventType: 'trade',
    price: 10000 + Math.random() * 2000,
    volume: Math.random() * 0.5,
    timestamp: new Date().toISOString(),
    raw: undefined,
  };
}
