// VORTEX — Historical Data Fetcher (Phase 5)
//
// Fetches OHLCV candles from the Binance public REST API for backtesting.
// Reuses the same endpoint as candleSeeder.ts (no API key required).
//
// Endpoint: GET https://api.binance.com/api/v3/klines
// Params:   symbol, interval, limit (max 1000 per Binance docs)
//
// On error: throws with a descriptive message so the runner can report it.

import { OHLCVCandle } from '../ingestion/candles/candleAggregator';

const BASE_URL    = 'https://api.binance.com/api/v3/klines';
const TIMEOUT_MS  = 15_000;
const MAX_LIMIT   = 1000;
const MIN_LIMIT   = 50;

export interface FetchOptions {
  symbol:   string;
  interval: '1m' | '5m' | '15m';
  limit:    number;  // 50–1000
}

function klineToCandle(raw: any[], symbol: string, interval: OHLCVCandle['interval']): OHLCVCandle {
  return {
    symbol,
    interval,
    openTime:  Number(raw[0]),
    closeTime: Number(raw[6]),
    open:      Number(raw[1]),
    high:      Number(raw[2]),
    low:       Number(raw[3]),
    close:     Number(raw[4]),
    volume:    Number(raw[5]),
    trades:    Number(raw[8]) || 0,
    closed:    true,
  };
}

export async function fetchHistoricalCandles(opts: FetchOptions): Promise<OHLCVCandle[]> {
  const limit  = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, opts.limit));
  const url    = `${BASE_URL}?symbol=${encodeURIComponent(opts.symbol)}&interval=${opts.interval}&limit=${limit}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method:  'GET',
      signal:  controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!resp.ok) {
      throw new Error(`Binance klines HTTP ${resp.status} for ${opts.symbol}/${opts.interval}`);
    }

    const data: any[][] = await resp.json();

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error(`Binance returned empty klines for ${opts.symbol}/${opts.interval}`);
    }

    // Drop the last candle — Binance includes the currently-open candle
    const closed = data.slice(0, -1);

    return closed.map(raw => klineToCandle(raw, opts.symbol, opts.interval));
  } catch (e: any) {
    clearTimeout(timer);
    if (e.name === 'AbortError') {
      throw new Error(`Binance klines request timed out after ${TIMEOUT_MS}ms`);
    }
    throw e;
  }
}
