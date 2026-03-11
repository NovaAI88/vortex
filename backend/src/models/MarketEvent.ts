// Canonical MarketEvent domain model for AETHER

export interface MarketEvent {
  exchange: string;
  symbol: string;
  eventType: string;
  price: number;
  volume: number;
  timestamp: string; // ISO8601
  raw?: any; // retain raw payload for audit/debug
}
