// In-memory rolling buffer for recent BTCUSDT trade prices
import { MarketEvent } from '../models/MarketEvent';

const MAX_POINTS = 1500;
const symbol = 'BTCUSDT'; // instrument focus for now
export type PricePoint = {
  timestamp: string;
  price: number;
};

const priceBuffer: PricePoint[] = [];

export function addMarketPrice(event: MarketEvent) {
  if (event.symbol !== symbol) return;
  priceBuffer.push({ timestamp: event.timestamp, price: event.price });
  if (priceBuffer.length > MAX_POINTS) priceBuffer.splice(0, priceBuffer.length - MAX_POINTS);
}

export function getRecentMarketPrices(): PricePoint[] {
  return priceBuffer.slice();
}

export function getLatestPrice(sym: string): { price: number; timestamp: string } | null {
  if (sym !== symbol) return null;
  const last = priceBuffer[priceBuffer.length - 1];
  return last ?? null;
}

export function getLatestPriceAge(sym: string): number {
  const last = getLatestPrice(sym);
  if (!last) return Infinity;
  return Date.now() - new Date(last.timestamp).getTime();
}
