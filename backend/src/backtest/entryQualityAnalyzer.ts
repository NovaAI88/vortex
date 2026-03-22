// VORTEX — Entry Quality Analyzer (Phase 7A / Phase 7B)
//
// Post-processes a completed BacktestTrade[] to:
//   1. Set quickStop = true for trades where stop was hit within 3 candles of entry
//   2. Bucket trades by regimeAge and compute win rate per bucket
//   3. Bucket TREND trades by ema20Slope direction and compute win rate
//   4. Bucket RANGE trades by rangeLocation zone and compute win rate
//   5. Bucket all trades by atrNormDist and compute win rate
//   6. Report % of trades that were regime-edge entries (age < 5)
//
// Phase 7B addition:
//   7. analyzeTrendSuppression() — separate function that re-runs the TREND strategy
//      over all warm TREND-regime candles in the replay and records why each candle
//      did NOT generate a signal. Returns rejection-reason breakdown, near-miss
//      counts, and blocker frequency ranking.
//
// All analysis is read-only — no simulation state is mutated.
// Input: trades[] from runSimulation(); replay states[] for candle count reference.
//
// Output: EntryQualityReport (structured for /api/diagnosis/entry-quality)

import { BacktestTrade } from './backtestTypes';
import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { analyzeMarket } from '../intelligence/aiAnalysisEngine';
import { generateTrendSignalWithDiagnostic, TrendRejectionReason } from '../intelligence/strategies/trendStrategy';

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

// ─── Phase 7B: TREND Suppression Diagnostic ───────────────────────────────

// A candle is a "near-miss" if only ONE guard is blocking the signal.
// This tells us which single gate would unlock the most TREND signals.
const NEAR_MISS_BLOCKER_THRESHOLD = 1;

export interface TrendBlockerCount {
  reason:    TrendRejectionReason;
  count:     number;
  pct:       number;
  nearMisses: number;  // how many of these were also near-misses (only 1 blocker)
}

export interface TrendSuppressionReport {
  // Overall TREND regime exposure
  totalTrendRegimeCandles:  number;   // warm candles where regime = TREND
  totalTrendSignalsEmitted: number;   // candles that produced a signal

  // Near-miss analysis
  // A near-miss = candle failed exactly one guard (removing it would emit a signal)
  nearMissCount:     number;
  nearMissPct:       number;   // % of rejected TREND candles

  // Blocker frequency ranking (sorted descending by count)
  blockerRanking:    TrendBlockerCount[];

  // Top conclusion: which single gate is responsible for the most suppression?
  dominantBlocker:   TrendRejectionReason;
  dominantBlockerPct: number;  // % of all rejections

  // Structural vs gate assessment
  // If TREND regime is rare (few totalTrendRegimeCandles), suppression is structural.
  // If TREND regime is common but signals are rare, one gate is dominant.
  assessment: string;
}

/**
 * Re-run the TREND strategy diagnostic over every warm TREND-regime candle.
 * Does NOT use trade history — works directly from replay states.
 *
 * @param states         Full replay state array from buildReplayStates()
 * @param minConfidence  Confidence threshold used in the simulation (default 0)
 */
export function analyzeTrendSuppression(
  states:         ProcessedMarketState[],
  minConfidence:  number = 0,
): TrendSuppressionReport {
  // Helper: rebuild feature snapshot (mirrors backtestSimulator.stateToFeatureSnapshot)
  function stateToSnapshot(state: ProcessedMarketState) {
    return {
      timestamp:       state.timestamp,
      candleCount:     0,
      indicatorsWarm:  state.indicatorsWarm ?? false,
      ema20:           state.ema20  ?? null,
      ema50:           state.ema50  ?? null,
      ema200:          state.ema200 ?? null,
      atr14:           state.atr14  ?? null,
      rsi14:           state.rsi14  ?? null,
      adx14:           state.adx14  ?? null,
      plusDI:          null,
      minusDI:         null,
      volatilityLevel: state.volatilityLevel ?? null,
      lastClose:       state.price,
    };
  }

  let totalTrendRegimeCandles  = 0;
  let totalTrendSignalsEmitted = 0;

  const rejectionCounts = new Map<TrendRejectionReason, number>();
  const nearMissCounts  = new Map<TrendRejectionReason, number>();
  let nearMissTotal     = 0;

  for (const state of states) {
    if (!state.indicatorsWarm) continue;

    const snap     = stateToSnapshot(state);
    const analysis = analyzeMarket(snap, state.price, state.newsRiskFlag ?? false);

    if (analysis.regime !== 'TREND') continue;
    if (analysis.confidence < minConfidence) continue;

    totalTrendRegimeCandles++;

    const diag = generateTrendSignalWithDiagnostic(state, analysis);

    if (diag.signal !== null) {
      // Signal was emitted
      totalTrendSignalsEmitted++;
    } else {
      // Rejected — record reason
      const reason = diag.rejectionReason;
      rejectionCounts.set(reason, (rejectionCounts.get(reason) ?? 0) + 1);

      // Near-miss detection: count how many OTHER guards would also block.
      // We do this by counting guards that fail independently (using diag snapshot).
      // A near-miss = only 1 blocker (i.e., the reported reason is the sole failure).
      const blockerCount = countBlockers(diag);
      if (blockerCount <= NEAR_MISS_BLOCKER_THRESHOLD) {
        nearMissTotal++;
        nearMissCounts.set(reason, (nearMissCounts.get(reason) ?? 0) + 1);
      }
    }
  }

  const totalRejected = totalTrendRegimeCandles - totalTrendSignalsEmitted;

  // Build blocker ranking
  const blockerRanking: TrendBlockerCount[] = Array.from(rejectionCounts.entries())
    .map(([reason, count]) => ({
      reason,
      count,
      pct:       pct(count, totalRejected),
      nearMisses: nearMissCounts.get(reason) ?? 0,
    }))
    .sort((a, b) => b.count - a.count);

  const dominantBlocker    = blockerRanking[0]?.reason ?? null;
  const dominantBlockerPct = blockerRanking[0]?.pct    ?? 0;

  // Structural vs gate assessment
  let assessment: string;
  if (totalTrendRegimeCandles === 0) {
    assessment = 'STRUCTURAL: No TREND regime candles in replay window. Market is predominantly RANGE. Not a gate suppression issue.';
  } else if (totalTrendRegimeCandles < 10) {
    assessment = `STRUCTURAL: Very few TREND regime candles (${totalTrendRegimeCandles}). TREND is rare in this dataset — likely a market-structure issue, not a gate issue.`;
  } else if (dominantBlockerPct >= 60) {
    assessment = `GATE_DOMINANT: ${dominantBlocker} accounts for ${dominantBlockerPct}% of TREND rejections. Relaxing this single gate would significantly increase TREND participation. Investigate before changing.`;
  } else if (dominantBlockerPct >= 30) {
    assessment = `GATE_PARTIAL: ${dominantBlocker} is the leading blocker (${dominantBlockerPct}%) but multiple gates contribute. Review top 2–3 blockers together.`;
  } else {
    assessment = `DISTRIBUTED: No single gate dominates. Suppression spread across multiple guards — likely reflective of genuine market conditions rather than misconfiguration.`;
  }

  return {
    totalTrendRegimeCandles,
    totalTrendSignalsEmitted,
    nearMissCount:       nearMissTotal,
    nearMissPct:         pct(nearMissTotal, totalRejected),
    blockerRanking,
    dominantBlocker,
    dominantBlockerPct,
    assessment,
  };
}

/**
 * Count how many distinct guards are blocking a TREND signal at this candle.
 * Uses the indicator snapshot from TrendSignalDiagnostic.
 * This is a lightweight heuristic — not a full re-evaluation of all guards,
 * but covers the 5 independent guards that can each block independently.
 *
 * Uses Phase 7B defaults (matches current trendStrategy module constants).
 */
function countBlockers(diag: ReturnType<typeof generateTrendSignalWithDiagnostic>): number {
  const {
    adx14AtEval, ema20AtEval, ema50AtEval,
    rsi14AtEval, distFromEma20,
    effectiveBias,   // Phase 7B: use resolved bias (post-inference), not raw analysis.bias
    rejectionReason,
  } = diag;

  // Phase 7B defaults — must stay in sync with trendStrategy module constants
  const ADX_MIN_DEFAULT                   = 25;
  const PULLBACK_MIN_DEFAULT              = 0.002;  // Phase 7B
  const PULLBACK_MAX_DEFAULT              = 0.035;  // Phase 7B
  const PULLBACK_DIR_TOLERANCE_DEFAULT    = 0.005;  // Phase 7B
  const RSI_LONG_MAX_DEFAULT              = 75;
  const RSI_SHORT_MIN_DEFAULT             = 25;

  let count = 0;

  // Guard: ADX too low
  if (adx14AtEval !== null && adx14AtEval < ADX_MIN_DEFAULT) count++;

  // Guard: neutral effective bias (after inference)
  if (effectiveBias === 'NEUTRAL') count++;

  // Guard: EMA stack misaligned vs effective bias
  if (ema20AtEval !== null && ema50AtEval !== null) {
    const longMisaligned  = effectiveBias === 'LONG'  && ema20AtEval <= ema50AtEval;
    const shortMisaligned = effectiveBias === 'SHORT' && ema20AtEval >= ema50AtEval;
    if (longMisaligned || shortMisaligned) count++;
  }

  // Guard: RSI overextended
  if (rsi14AtEval !== null) {
    if (effectiveBias === 'LONG'  && rsi14AtEval >= RSI_LONG_MAX_DEFAULT)  count++;
    if (effectiveBias === 'SHORT' && rsi14AtEval <= RSI_SHORT_MIN_DEFAULT) count++;
  }

  // Guard: pullback window
  if (distFromEma20 !== null) {
    if (distFromEma20 < PULLBACK_MIN_DEFAULT || distFromEma20 > PULLBACK_MAX_DEFAULT) count++;
  }

  // Guard: pullback direction (uses decoupled tolerance, not pullbackMin)
  if (ema20AtEval !== null && distFromEma20 !== null) {
    const price = ema20AtEval * (1 + (effectiveBias === 'LONG' ? distFromEma20 : -distFromEma20));
    const longDirWrong  = effectiveBias === 'LONG'  && price > ema20AtEval * (1 + PULLBACK_DIR_TOLERANCE_DEFAULT);
    const shortDirWrong = effectiveBias === 'SHORT' && price < ema20AtEval * (1 - PULLBACK_DIR_TOLERANCE_DEFAULT);
    if (longDirWrong || shortDirWrong) count++;
  }

  // If zero guards are independently detectable, default to 1
  return Math.max(count, rejectionReason !== null ? 1 : 0);
}
