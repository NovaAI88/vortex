// Advisory TradeSignal canonical model (no execution/risk/order fields)
export interface TradeSignal {
  source: string;
  symbol: string;
  signalType: string; // "buy", "sell", "hold", etc.
  confidence: number; // 0..1
  rationale: string;
  timestamp: string;
  baseState: any; // ProcessedMarketState reference
}
