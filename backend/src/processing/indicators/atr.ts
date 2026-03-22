// VORTEX — ATR Indicator (Phase 1)
//
// Average True Range — Wilder smoothing, 14-period default.
//
// True Range = max(H-L, |H-prevC|, |L-prevC|)
// ATR = Wilder EMA of True Range over `period`
//
// Requires at least period+1 candles (period TR values need period+1 closes).
// Returns null if insufficient data.

import { OHLCVCandle } from '../../ingestion/candles/candleAggregator';
import { computeWilderEMA } from './ema';

export function computeTrueRanges(candles: OHLCVCandle[]): number[] {
  if (candles.length < 2) return [];

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const h  = candles[i].high;
    const l  = candles[i].low;
    const pc = candles[i - 1].close;
    trs.push(Math.max(h - l, Math.abs(h - pc), Math.abs(l - pc)));
  }
  return trs;
}

export function computeATR(candles: OHLCVCandle[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const trs = computeTrueRanges(candles);
  const atr = computeWilderEMA(trs, period);
  return atr !== null ? Number(atr.toFixed(8)) : null;
}
