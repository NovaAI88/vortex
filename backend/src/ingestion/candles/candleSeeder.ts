// VORTEX — Candle Seeder (Phase 1)
//
// Fetches historical OHLCV candles from Binance REST API at startup
// and seeds the candle aggregator buffers so indicators are warm immediately.
//
// Endpoints used (all public, no API key required):
//   GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1m&limit=200
//   GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=200
//   GET https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=15m&limit=200
//
// Kline array format (Binance): [openTime, open, high, low, close, vol, closeTime, ...]
//
// On failure: logs warning and returns without seeding. System warms up naturally.
// Does NOT crash or block startup on failure.

import { OHLCVCandle, seedCandles } from './candleAggregator';
import { logger } from '../../utils/logger';

const BASE_URL = 'https://api.binance.com/api/v3/klines';
const SYMBOL   = 'BTCUSDT';
const LIMIT    = 200;
const TIMEOUT_MS = 8000;

function klineToCandle(raw: any[], interval: OHLCVCandle['interval']): OHLCVCandle {
  return {
    symbol:    SYMBOL,
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

async function fetchKlines(interval: '1m' | '5m' | '15m'): Promise<OHLCVCandle[]> {
  const url = `${BASE_URL}?symbol=${SYMBOL}&interval=${interval}&limit=${LIMIT}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const resp = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timeout);

    if (!resp.ok) {
      logger.warn('candleSeeder', `Klines fetch failed: HTTP ${resp.status}`, { interval });
      return [];
    }

    const data: any[][] = await resp.json();
    if (!Array.isArray(data) || data.length === 0) return [];

    // Exclude the last candle — it may still be open (Binance returns the current open candle)
    const closed = data.slice(0, -1);
    return closed.map(raw => klineToCandle(raw, interval));
  } catch (e) {
    clearTimeout(timeout);
    logger.warn('candleSeeder', `Klines fetch error`, { interval, err: String(e) });
    return [];
  }
}

export async function seedHistoricalCandles(): Promise<void> {
  logger.info('candleSeeder', 'Fetching historical candles from Binance REST...');

  const [candles1m, candles5m, candles15m] = await Promise.all([
    fetchKlines('1m'),
    fetchKlines('5m'),
    fetchKlines('15m'),
  ]);

  if (candles1m.length === 0 && candles5m.length === 0 && candles15m.length === 0) {
    logger.warn('candleSeeder', 'All kline fetches returned empty — indicators will warm up from live data');
    return;
  }

  seedCandles({ '1m': candles1m, '5m': candles5m, '15m': candles15m });

  logger.info('candleSeeder', 'Candle buffers seeded', {
    '1m': candles1m.length,
    '5m': candles5m.length,
    '15m': candles15m.length,
  });
}
