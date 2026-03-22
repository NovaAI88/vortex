// VORTEX — ADX Indicator (Phase 1)
//
// Average Directional Index — Wilder smoothing, 14-period default.
//
// Pipeline:
//   1. Compute True Range, +DM, -DM for each bar (requires 2 candles per value)
//   2. Wilder-smooth TR14, +DM14, -DM14 over `period`
//   3. +DI14 = (+DM14 / TR14) * 100
//   4. -DI14 = (-DM14 / TR14) * 100
//   5. DX    = |+DI14 - -DI14| / |+DI14 + -DI14| * 100
//   6. ADX   = Wilder EMA of DX over `period`
//
// Minimum candles: 2 × period + 1 (= 29 for period=14).
// Returns null if data is insufficient.
// Also exposes +DI and -DI for trend direction analysis in Phase 2.

import { OHLCVCandle } from '../../ingestion/candles/candleAggregator';

export interface ADXResult {
  adx:    number | null;
  plusDI: number | null;
  minusDI: number | null;
}

export function computeADX(candles: OHLCVCandle[], period = 14): ADXResult {
  const nullResult: ADXResult = { adx: null, plusDI: null, minusDI: null };
  if (candles.length < 2 * period + 1) return nullResult;

  // Step 1: raw TR, +DM, -DM per bar
  const trs:    number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const curr = candles[i];
    const prev = candles[i - 1];

    const tr = Math.max(
      curr.high - curr.low,
      Math.abs(curr.high - prev.close),
      Math.abs(curr.low  - prev.close)
    );

    const upMove   = curr.high - prev.high;
    const downMove = prev.low  - curr.low;

    const plusDM  = (upMove   > downMove && upMove   > 0) ? upMove   : 0;
    const minusDM = (downMove > upMove   && downMove > 0) ? downMove : 0;

    trs.push(tr);
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }

  // Step 2: Wilder smooth TR, +DM, -DM
  let smoothTR    = trs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothPlusDM  = plusDMs.slice(0, period).reduce((a, b) => a + b, 0);
  let smoothMinusDM = minusDMs.slice(0, period).reduce((a, b) => a + b, 0);

  // Collect DX values starting from the first full DI computation
  const dxValues: number[] = [];

  function dxFromSmooth(sTR: number, sPDM: number, sMDM: number): number | null {
    if (sTR === 0) return null;
    const pDI = (sPDM / sTR) * 100;
    const mDI = (sMDM / sTR) * 100;
    const diSum  = pDI + mDI;
    const diDiff = Math.abs(pDI - mDI);
    return diSum === 0 ? 0 : (diDiff / diSum) * 100;
  }

  // First DX from seeded smoothed values
  const firstDX = dxFromSmooth(smoothTR, smoothPlusDM, smoothMinusDM);
  if (firstDX !== null) dxValues.push(firstDX);

  for (let i = period; i < trs.length; i++) {
    smoothTR     = smoothTR     - smoothTR     / period + trs[i];
    smoothPlusDM  = smoothPlusDM  - smoothPlusDM  / period + plusDMs[i];
    smoothMinusDM = smoothMinusDM - smoothMinusDM / period + minusDMs[i];

    const dx = dxFromSmooth(smoothTR, smoothPlusDM, smoothMinusDM);
    if (dx !== null) dxValues.push(dx);
  }

  // Step 6: ADX = Wilder EMA of DX values over `period`
  if (dxValues.length < period) return nullResult;

  let adx = dxValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < dxValues.length; i++) {
    adx = (adx * (period - 1) + dxValues[i]) / period;
  }

  // Final DI values (from last smoothed values)
  const finalPlusDI  = smoothTR > 0 ? (smoothPlusDM  / smoothTR) * 100 : null;
  const finalMinusDI = smoothTR > 0 ? (smoothMinusDM / smoothTR) * 100 : null;

  return {
    adx:    Number(adx.toFixed(4)),
    plusDI: finalPlusDI  !== null ? Number(finalPlusDI.toFixed(4))  : null,
    minusDI: finalMinusDI !== null ? Number(finalMinusDI.toFixed(4)) : null,
  };
}
