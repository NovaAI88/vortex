// VORTEX — RSI Indicator (Phase 1)
//
// Relative Strength Index — Wilder smoothing, 14-period default.
//
// Step 1: Compute gains/losses for each close-to-close change.
// Step 2: Seed with SMA of first `period` gains and losses.
// Step 3: Apply Wilder smoothing for remaining values.
// Step 4: RSI = 100 - (100 / (1 + avgGain/avgLoss))
//
// Returns null if fewer than period+1 closes provided.
// Returns 50 (neutral) if avgLoss is 0 to avoid division by zero.

import { OHLCVCandle } from '../../ingestion/candles/candleAggregator';

export function computeRSI(candles: OHLCVCandle[], period = 14): number | null {
  if (candles.length < period + 1) return null;

  const closes = candles.map(c => c.close);

  // Compute raw gains and losses
  const changes: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    changes.push(closes[i] - closes[i - 1]);
  }

  // Seed: SMA of first `period` gains and losses
  const seedGains  = changes.slice(0, period).filter(c => c > 0);
  const seedLosses = changes.slice(0, period).filter(c => c < 0).map(c => Math.abs(c));

  let avgGain = seedGains.reduce((a, b)  => a + b, 0) / period;
  let avgLoss = seedLosses.reduce((a, b) => a + b, 0) / period;

  // Wilder smoothing for remaining changes
  for (let i = period; i < changes.length; i++) {
    const gain = changes[i] > 0 ? changes[i] : 0;
    const loss = changes[i] < 0 ? Math.abs(changes[i]) : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100; // no losses — fully bullish
  const rs  = avgGain / avgLoss;
  const rsi = 100 - (100 / (1 + rs));

  return Number(rsi.toFixed(4));
}
