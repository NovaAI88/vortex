// Minimal volatile in-memory order book state for API bridge
export interface BookLevel {
  price: string;
  size: string;
}
export interface OrderBookSnapshot {
  bids: BookLevel[];
  asks: BookLevel[];
  support: string;
  resistance: string;
  timestamp: string;
}
let lastOrderBook: OrderBookSnapshot|null = null;
export function updateOrderBook(ob: OrderBookSnapshot) {
  lastOrderBook = ob;
}
export function getOrderBook(): OrderBookSnapshot|null {
  return lastOrderBook;
}
