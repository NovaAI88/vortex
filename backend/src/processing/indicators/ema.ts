// VORTEX — EMA Indicator (Phase 1)
//
// Exponential Moving Average — standard price-EMA formula.
// k = 2 / (period + 1)
// EMA[i] = close[i] * k + EMA[i-1] * (1 - k)
//
// Seeded with SMA of first `period` closes.
// Returns null if fewer than `period` closes provided.

export function computeEMA(closes: number[], period: number): number | null {
  if (closes.length < period) return null;

  const k = 2 / (period + 1);

  // Seed with SMA of first `period` values
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return Number(ema.toFixed(8));
}

// Wilder's smoothing (used by ATR, RSI, ADX): k = 1 / period
// First value is a simple average of the first `period` values.
export function computeWilderEMA(values: number[], period: number): number | null {
  if (values.length < period) return null;

  let ema = values.slice(0, period).reduce((a, b) => a + b, 0) / period;

  for (let i = period; i < values.length; i++) {
    ema = (ema * (period - 1) + values[i]) / period;
  }

  return ema;
}
