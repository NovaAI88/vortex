// VORTEX — Entry Quality Analyzer (Phase 7A)
//
// Post-processes a completed BacktestTrade[] to:
//   1. Set quickStop = true for trades where stop was hit within 3 candles of entry
//   2. Bucket trades by regimeAge and compute win rate per bucket
//   3. Bucket TREND trades by ema20Slope direction and compute win rate
//   4. Bucket RANGE trades by rangeLocation zone and compute win rate
//   5. Bucket all trades by atrNormDist and compute win rate
//   6. Report % of trades that were regime-edge entries (age < 5)
//
// All analysis is read-only — no simulation state is mutated.
// Input: trades[] from runSimulation(); replay states[] for candle count reference.
//
// Output: EntryQualityReport (structured for /api/diagnosis/entry-quality)

import { BacktestTrade } from './backtestTypes';

// ─── Output types ──────────────────────────────────────────────────────────

export interface BucketStats {
  label:       string;
  count:       number;
  wins:        number;
  winRate:     number;    // %
  avgR:        number;
  expectancyR: number;
  avgRegimeAge: number | null;  // only for age-bucketed views
}

export interface EntryQualityReport {
  totalTrades:         number;
  tradesWithDiagnostics: number;  // trades that have regimeAge set (not null)

  // Regime-edge analysis
  edgeEntryCount:      number;    // trades with regimeAge < 5
  edgeEntryPct:        number;    // %
  edgeEntryWinRate:    number;    // win rate of edge entries
  establishedWinRate:  number;    // win rate of entries with regimeAge >= 5

  // Bucketed by regime age
  byRegimeAge:         BucketStats[];

  // Bucketed by EMA20 slope direction at entry (TREND trades only)
  byEma20Slope:        BucketStats[];

  // Bucketed by ATR-normalized pullback distance (all trades)
  byAtrNormDist:       BucketStats[];

  // Bucketed by range location (RANGE trades only)
  byRangeLocation:     BucketStats[];

  // Quick-stop analysis
  quickStopCount:      number;    // stop hit within 3 candles
  quickStopPct:        number;    // % of all trades
  quickStopWinRateContext: number; // what % of quick stops came from edge entries

  // Per-strategy summary
  byStrategy:          StrategyEntryStats[];
}

export interface StrategyEntryStats {
  strategyId:          string;
  count:               number;
  winRate:             number;
  avgRegimeAge:        number | null;
  edgeEntryPct:        number;    // % of this strategy's trades that were edge entries
  avgAtrNormDist:      number | null;
  avgRangeLocation:    number | null;  // null for TREND
}

// ─── Public API ────────────────────────────────────────────────────────────

const QUICK_STOP_CANDLES = 3;    // stop within this many candles = quick stop
const EDGE_REGIME_AGE    = 5;    // < this = regime-edge entry

/**
 * Analyze entry quality of a completed simulation's trades.
 * @param trades     Output of runSimulation().trades
 * @param totalCandles  Total candles in the replay (for context only)
 */
export function analyzeEntryQuality(
  trades:       BacktestTrade[],
  totalCandles: number,
): EntryQualityReport {
  // ── 1. Mark quick stops ──────────────────────────────────────────────────
  // Mutate a working copy so the originals are untouched
  const annotated: BacktestTrade[] = trades.map(t => ({
    ...t,
    quickStop: t.exitReason === 'stopLoss' &&
               (t.exitIndex - t.entryIndex) <= QUICK_STOP_CANDLES,
  }));

  const withDiag = annotated.filter(t => t.regimeAge !== null && t.regimeAge !== undefined);

  // ── 2. Regime-edge analysis ──────────────────────────────────────────────
  const edgeTrades        = withDiag.filter(t => (t.regimeAge ?? 999) < EDGE_REGIME_AGE);
  const establishedTrades = withDiag.filter(t => (t.regimeAge ?? 0)   >= EDGE_REGIME_AGE);

  const edgeEntryWinRate    = winRate(edgeTrades);
  const establishedWinRate  = winRate(establishedTrades);

  // ── 3. Regime-age buckets ────────────────────────────────────────────────
  const ageBuckets: [string, (age: number) => boolean][] = [
    ['0–2',   age => age <= 2],
    ['3–5',   age => age >= 3  && age <= 5],
    ['6–10',  age => age >= 6  && age <= 10],
    ['11–20', age => age >= 11 && age <= 20],
    ['21+',   age => age >= 21],
  ];

  const byRegimeAge = ageBuckets.map(([label, fn]) => {
    const bucket = withDiag.filter(t => t.regimeAge !== null && fn(t.regimeAge!));
    return buildBucketStats(label, bucket, true);
  });

  // ── 4. EMA20 slope buckets (TREND trades only) ───────────────────────────
  const trendTrades = annotated.filter(t => t.strategyId?.includes('trend'));
  const trendWithSlope = trendTrades.filter(t => t.ema20SlopeAtEntry !== null);

  const slopeBuckets: [string, (s: number) => boolean][] = [
    ['Strongly falling (<-5)', s => s < -5],
    ['Falling (-5 to -1)',     s => s >= -5 && s < -1],
    ['Flat (-1 to +1)',        s => s >= -1 && s <= 1],
    ['Rising (+1 to +5)',      s => s > 1   && s <= 5],
    ['Strongly rising (>+5)',  s => s > 5],
  ];

  const byEma20Slope = slopeBuckets.map(([label, fn]) => {
    const bucket = trendWithSlope.filter(t => fn(t.ema20SlopeAtEntry!));
    return buildBucketStats(label, bucket, false);
  });

  // ── 5. ATR-normalized distance buckets (all trades) ──────────────────────
  const withAtr = annotated.filter(t => t.atrNormDistAtEntry !== null);

  const atrBuckets: [string, (d: number) => boolean][] = [
    ['< 0.2 ATR',   d => d < 0.2],
    ['0.2–0.5 ATR', d => d >= 0.2 && d < 0.5],
    ['0.5–1.0 ATR', d => d >= 0.5 && d < 1.0],
    ['1.0–1.5 ATR', d => d >= 1.0 && d < 1.5],
    ['> 1.5 ATR',   d => d >= 1.5],
  ];

  const byAtrNormDist = atrBuckets.map(([label, fn]) => {
    const bucket = withAtr.filter(t => fn(t.atrNormDistAtEntry!));
    return buildBucketStats(label, bucket, false);
  });

  // ── 6. Range location buckets (RANGE trades only) ────────────────────────
  // Location 0 = at range low (ideal BUY), 1 = at range high (ideal SELL).
  // For BUYs we want location near 0; for SELLs near 1.
  // Report raw distribution to expose middle-zone (0.3–0.7) entries.
  const rangeTrades = annotated.filter(t => t.strategyId?.includes('range'));
  const rangeWithLoc = rangeTrades.filter(t => t.rangeLocationAtEntry !== null);

  const locBuckets: [string, (loc: number) => boolean][] = [
    ['Bottom zone (0–0.2)',  loc => loc <= 0.2],
    ['Lower mid (0.2–0.4)', loc => loc > 0.2 && loc <= 0.4],
    ['Middle (0.4–0.6)',    loc => loc > 0.4 && loc <= 0.6],
    ['Upper mid (0.6–0.8)', loc => loc > 0.6 && loc <= 0.8],
    ['Top zone (0.8–1.0)',  loc => loc > 0.8],
  ];

  const byRangeLocation = locBuckets.map(([label, fn]) => {
    const bucket = rangeWithLoc.filter(t => fn(t.rangeLocationAtEntry!));
    return buildBucketStats(label, bucket, false);
  });

  // ── 7. Quick-stop analysis ────────────────────────────────────────────────
  const quickStops = annotated.filter(t => t.quickStop);
  const quickStopEdge = quickStops.filter(t => (t.regimeAge ?? 999) < EDGE_REGIME_AGE);
  const quickStopWinRateContext = quickStops.length > 0
    ? (quickStopEdge.length / quickStops.length) * 100
    : 0;

  // ── 8. Per-strategy summary ───────────────────────────────────────────────
  const strategyIds = [...new Set(annotated.map(t => t.strategyId))];
  const byStrategy: StrategyEntryStats[] = strategyIds.map(sid => {
    const st = annotated.filter(t => t.strategyId === sid);
    const stEdge = st.filter(t => (t.regimeAge ?? 999) < EDGE_REGIME_AGE);
    const stWithAge = st.filter(t => t.regimeAge !== null);
    const stWithAtr = st.filter(t => t.atrNormDistAtEntry !== null);
    const stWithLoc = st.filter(t => t.rangeLocationAtEntry !== null);

    const avgAge = stWithAge.length > 0
      ? stWithAge.reduce((s, t) => s + t.regimeAge!, 0) / stWithAge.length
      : null;
    const avgAtr = stWithAtr.length > 0
      ? stWithAtr.reduce((s, t) => s + t.atrNormDistAtEntry!, 0) / stWithAtr.length
      : null;
    const avgLoc = stWithLoc.length > 0
      ? stWithLoc.reduce((s, t) => s + t.rangeLocationAtEntry!, 0) / stWithLoc.length
      : null;

    return {
      strategyId:       sid,
      count:            st.length,
      winRate:          winRate(st),
      avgRegimeAge:     avgAge !== null ? Number(avgAge.toFixed(1)) : null,
      edgeEntryPct:     st.length > 0 ? Number(((stEdge.length / st.length) * 100).toFixed(1)) : 0,
      avgAtrNormDist:   avgAtr !== null ? Number(avgAtr.toFixed(3)) : null,
      avgRangeLocation: avgLoc !== null ? Number(avgLoc.toFixed(3)) : null,
    };
  });

  return {
    totalTrades:          annotated.length,
    tradesWithDiagnostics: withDiag.length,

    edgeEntryCount:       edgeTrades.length,
    edgeEntryPct:         pct(edgeTrades.length, withDiag.length),
    edgeEntryWinRate:     Number(edgeEntryWinRate.toFixed(1)),
    establishedWinRate:   Number(establishedWinRate.toFixed(1)),

    byRegimeAge,
    byEma20Slope,
    byAtrNormDist,
    byRangeLocation,

    quickStopCount:           quickStops.length,
    quickStopPct:             pct(quickStops.length, annotated.length),
    quickStopWinRateContext:  Number(quickStopWinRateContext.toFixed(1)),

    byStrategy,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function buildBucketStats(
  label:       string,
  bucket:      BacktestTrade[],
  includeAge:  boolean,
): BucketStats {
  const wins       = bucket.filter(t => t.isWin);
  const wr         = winRate(bucket);
  const avgR       = bucket.length > 0
    ? bucket.reduce((s, t) => s + t.realizedR, 0) / bucket.length
    : 0;
  const winsR      = wins.map(t => t.realizedR);
  const lossesR    = bucket.filter(t => !t.isWin).map(t => t.realizedR);
  const avgWinR    = winsR.length   > 0 ? winsR.reduce((s, r) => s + r, 0)   / winsR.length   : 0;
  const avgLossR   = lossesR.length > 0 ? lossesR.reduce((s, r) => s + Math.abs(r), 0) / lossesR.length : 0;
  const wRate      = bucket.length  > 0 ? wins.length / bucket.length : 0;
  const expectancyR = wRate * avgWinR - (1 - wRate) * avgLossR;

  const avgRegimeAge: number | null = includeAge && bucket.length > 0
    ? Number((bucket
        .filter(t => t.regimeAge !== null)
        .reduce((s, t) => s + t.regimeAge!, 0) /
        Math.max(1, bucket.filter(t => t.regimeAge !== null).length)
      ).toFixed(1))
    : null;

  return {
    label,
    count:        bucket.length,
    wins:         wins.length,
    winRate:      Number(wr.toFixed(1)),
    avgR:         Number(avgR.toFixed(4)),
    expectancyR:  Number(expectancyR.toFixed(4)),
    avgRegimeAge,
  };
}

function winRate(trades: BacktestTrade[]): number {
  if (trades.length === 0) return 0;
  return (trades.filter(t => t.isWin).length / trades.length) * 100;
}

function pct(n: number, total: number): number {
  return total > 0 ? Number(((n / total) * 100).toFixed(1)) : 0;
}
