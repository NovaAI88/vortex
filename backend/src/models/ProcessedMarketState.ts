// Canonical ProcessedMarketState domain model
import { MarketEvent } from './MarketEvent';

export interface ProcessedMarketState {
  // --- Core (always present) ---
  exchange: string;
  symbol: string;
  eventType: string;
  price: number;
  volume: number;
  timestamp: string;
  enriched?: boolean;
  baseEvent: MarketEvent;

  // --- Legacy (kept for backward compatibility) ---
  movingAvg?: number;  // = ema20 when available, else 7-tick rolling avg

  // --- Phase 1: OHLCV candle reference ---
  candleTs?: string | null;          // ISO timestamp of last closed 1m candle
  candleOpen?: number | null;
  candleHigh?: number | null;
  candleLow?: number | null;
  candleClose?: number | null;
  candleVolume?: number | null;
  indicatorsWarm?: boolean;          // false until enough candles accumulated

  // --- Phase 1: Computed indicators (null until warm) ---
  ema20?: number | null;
  ema50?: number | null;
  ema200?: number | null;
  atr14?: number | null;             // Average True Range, 14-period
  rsi14?: number | null;             // RSI, 14-period (0–100)
  adx14?: number | null;             // ADX, 14-period (0–100)

  // --- Phase 1: Derived features ---
  volatilityLevel?: number | null;   // normalised ATR/price → 0–1
  newsRiskFlag?: boolean;            // true = major news risk detected
}