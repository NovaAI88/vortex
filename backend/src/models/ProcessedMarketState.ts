// Canonical ProcessedMarketState domain model
import { MarketEvent } from './MarketEvent';

export interface ProcessedMarketState {
  exchange: string;
  symbol: string;
  eventType: string; // e.g. 'trade', 'book_update'
  price: number;
  volume: number;
  timestamp: string;
  movingAvg?: number;  // minimal enrichment example
  enriched?: boolean;
  baseEvent: MarketEvent;
}