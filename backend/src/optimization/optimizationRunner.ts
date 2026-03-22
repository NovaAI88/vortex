// VORTEX — Optimization Runner (Phase 6)
//
// Runs a grid search across parameter combinations using the Phase 5 backtest engine.
//
// ── Train / validation split ──────────────────────────────────────────────
//
// The fetched candle series is split into:
//   - Training window:    candles[0 .. floor(N × trainFraction) - 1]
//   - Validation window:  candles[floor(N × trainFraction) .. N - 1]
//
// Both windows go through buildReplayStates() independently, ensuring
// indicator warmup happens correctly within each window. A consequence is
// that validation states have fewer warm candles at their start (normal —
// matches real-world deployment from a cold start).
//
// Optimization objective is computed on the training window only.
// Validation metrics are reported for comparison but never used to rank.
//
// ── Stability analysis ────────────────────────────────────────────────────
//
// After all runs complete, each ranked result's neighbors (param sets
// differing in exactly one dimension by ±1 step) are identified.
// stabilityScore = mean(neighbor expectancyR) / winner expectancyR
// isFragile = stabilityScore < 0.5
//
// ── Sequential execution ──────────────────────────────────────────────────
// Runs are executed sequentially (not parallel) to avoid memory spikes.
// Each run reuses the same pre-built replay states.

import { fetchHistoricalCandles } from '../backtest/historicalDataFetcher';
import { buildReplayStates }      from '../backtest/historicalFeatureBuilder';
import { runSimulation }          from '../backtest/backtestSimulator';
import { computeBacktestMetrics } from '../backtest/backtestMetrics';
import { BacktestConfig }         from '../backtest/backtestTypes';
import { generateParamGrid, STANDARD_DIMENSIONS, findNeighbors } from './paramGrid';
import {
  OptimizationConfig,
  OptimizationRunResult,
  OptimizationState,
  RankedResult,
  SplitMetrics,
  StabilityView,
  ParamSet,
} from './optimizationTypes';

// ─── In-memory state ───────────────────────────────────────────────────────

let state: OptimizationState = {
  status:        'idle',
  progress:      0,
  totalRuns:     0,
  completedRuns: 0,
};

export function getOptimizationState(): OptimizationState {
  return state;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function startOptimization(config: OptimizationConfig): Promise<string> {
  if (state.status === 'running') {
    throw new Error('Optimization already running');
  }

  const runId = `opt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

  // Generate param grid synchronously before launching
  const paramGrid = generateParamGrid(config);

  state = {
    status:        'running',
    progress:      0,
    totalRuns:     paramGrid.length,
    completedRuns: 0,
    runId,
    config,
    startTime:     new Date().toISOString(),
  };

  executeOptimization(runId, config, paramGrid).catch(err => {
    state = {
      ...state,
      status: 'error',
      error:  String(err?.message ?? err),
    };
  });

  return runId;
}

// ─── Core execution ────────────────────────────────────────────────────────

async function executeOptimization(
  runId:     string,
  config:    OptimizationConfig,
  paramGrid: ParamSet[],
): Promise<void> {
  const t0 = Date.now();

  try {
    // ── Step 1: Fetch full candle series ──────────────────────────────────
    updateProgress(5);
    const candles = await fetchHistoricalCandles({
      symbol:   config.symbol,
      interval: config.interval,
      limit:    config.limit,
    });

    // ── Step 2: Split into train / validation windows ─────────────────────
    updateProgress(10);
    const splitIdx   = Math.floor(candles.length * config.trainFraction);
    const trainCandles = candles.slice(0, splitIdx);
    const valCandles   = candles.slice(splitIdx);

    if (trainCandles.length < 60) {
      throw new Error(`Training window too small: ${trainCandles.length} candles (need ≥60)`);
    }
    if (valCandles.length < 20) {
      throw new Error(`Validation window too small: ${valCandles.length} candles (need ≥20)`);
    }

    // ── Step 3: Build replay states for each window ───────────────────────
    updateProgress(15);
    const trainStates = buildReplayStates(trainCandles);
    const valStates   = buildReplayStates(valCandles);
    const allStates   = buildReplayStates(candles);

    // ── Step 4: Run simulation for each param set ─────────────────────────
    const backtestConfig: BacktestConfig = {
      symbol:          config.symbol,
      interval:        config.interval,
      limit:           config.limit,
      initialCapital:  config.initialCapital,
      positionSizePct: config.positionSizePct,
      exitMode:        config.exitMode,
      riskPerTrade:    0.01,
    };

    const allResults: OptimizationRunResult[] = [];

    for (let i = 0; i < paramGrid.length; i++) {
      const ps = paramGrid[i];
      const progress = 15 + Math.floor((i / paramGrid.length) * 70);
      state = { ...state, completedRuns: i, progress };

      const result = runOneSet(ps, backtestConfig, trainStates, valStates, allStates, config);
      allResults.push(result);
    }

    // ── Step 5: Rank results ──────────────────────────────────────────────
    updateProgress(88);
    const dims = config.dimensions.length > 0 ? config.dimensions : STANDARD_DIMENSIONS;
    const ranked = rankResults(allResults, config, dims);

    // ── Step 6: Store ─────────────────────────────────────────────────────
    state = {
      status:        'done',
      progress:      100,
      totalRuns:     paramGrid.length,
      completedRuns: paramGrid.length,
      runId,
      config,
      ranked,
      startTime:     state.startTime,
      endTime:       new Date().toISOString(),
      durationMs:    Date.now() - t0,
    };

  } catch (err: any) {
    state = {
      ...state,
      status: 'error',
      error:  String(err?.message ?? err),
    };
    throw err;
  }
}

// ─── Single-set simulation ─────────────────────────────────────────────────

function runOneSet(
  ps:            ParamSet,
  config:        BacktestConfig,
  trainStates:   ReturnType<typeof buildReplayStates>,
  valStates:     ReturnType<typeof buildReplayStates>,
  allStates:     ReturnType<typeof buildReplayStates>,
  optConfig:     OptimizationConfig,
): OptimizationRunResult {
  // Train run
  const trainSim  = runSimulation(trainStates, config, ps);
  const trainFull = computeBacktestMetrics(
    trainSim.trades, trainSim.equityCurve, config,
    `train-${ps.id}`, '', '', 0,
  );

  // Validation run
  const valSim  = runSimulation(valStates, config, ps);
  const valFull = computeBacktestMetrics(
    valSim.trades, valSim.equityCurve, config,
    `val-${ps.id}`, '', '', 0,
  );

  // Combined (full dataset)
  const allSim  = runSimulation(allStates, config, ps);
  const allFull = computeBacktestMetrics(
    allSim.trades, allSim.equityCurve, config,
    `all-${ps.id}`, '', '', 0,
  );

  const toSplit = (r: typeof trainFull): SplitMetrics => ({
    totalTrades:  r.summary.totalTrades,
    winRate:      r.summary.winRate,
    expectancyR:  r.summary.expectancyR,
    avgR:         r.summary.avgR,
    sharpeRatio:  r.sharpeRatio,
    maxDrawdown:  r.maxDrawdown,
    totalReturn:  r.totalReturn,
    profitFactor: r.summary.profitFactor,
  });

  const isFiltered = (
    trainFull.summary.totalTrades < optConfig.minTrades ||
    trainFull.maxDrawdown > optConfig.maxDrawdownFilter
  );

  return {
    paramSet:     ps,
    train:        toSplit(trainFull),
    validation:   toSplit(valFull),
    combined:     toSplit(allFull),
    candlesTrain: trainStates.length,
    candlesVal:   valStates.length,
    isSerious:    trainFull.summary.totalTrades >= optConfig.seriousCandidateMin,
    isFiltered,
  };
}

// ─── Ranking ───────────────────────────────────────────────────────────────
//
// Primary objective: expectancyR on training set
// Tiebreaker: sharpeRatio
// Filtered: maxDrawdown > maxDrawdownFilter OR totalTrades < minTrades
//
// Stability: computed for every result (even filtered ones — for diagnostics)

function rankResults(
  results:   OptimizationRunResult[],
  config:    OptimizationConfig,
  dims:      typeof STANDARD_DIMENSIONS,
): RankedResult[] {
  // Score each result
  const scored = results.map(r => ({
    result: r,
    score:  computeScore(r),
  }));

  // Sort: unfiltered first (by score desc), then filtered (by score desc)
  scored.sort((a, b) => {
    if (a.result.isFiltered !== b.result.isFiltered) {
      return a.result.isFiltered ? 1 : -1;
    }
    return b.score - a.score;
  });

  // Compute stability for each result
  const allSets = results.map(r => r.paramSet);
  const allResultsMap = new Map(results.map(r => [r.paramSet.id, r]));

  return scored.map((entry, idx) => {
    const stability = computeStability(entry.result, allSets, allResultsMap, dims);
    return {
      rank:      idx + 1,
      result:    entry.result,
      score:     Number(entry.score.toFixed(4)),
      stability,
    };
  });
}

function computeScore(r: OptimizationRunResult): number {
  if (r.isFiltered) return -999;
  // Primary: expectancyR (training). Tiebreaker: sharpeRatio / 10 (scaled down).
  return r.train.expectancyR + r.train.sharpeRatio / 10;
}

function computeStability(
  result:        OptimizationRunResult,
  allSets:       ParamSet[],
  allResultsMap: Map<string, OptimizationRunResult>,
  dims:          typeof STANDARD_DIMENSIONS,
): StabilityView {
  const neighbors = findNeighbors(result.paramSet, allSets, dims);
  if (neighbors.length === 0) {
    return {
      nearbyCount:    0,
      nearbyWinRate:  result.train.winRate,
      nearbyExpR:     result.train.expectancyR,
      stabilityScore: 1,   // no neighbors to compare → not fragile by definition
      isFragile:      false,
    };
  }

  const neighborResults = neighbors
    .map(n => allResultsMap.get(n.id))
    .filter((r): r is OptimizationRunResult => r !== undefined && !r.isFiltered);

  if (neighborResults.length === 0) {
    // All neighbors were filtered — that's a fragility signal
    return {
      nearbyCount:    neighbors.length,
      nearbyWinRate:  0,
      nearbyExpR:     0,
      stabilityScore: 0,
      isFragile:      true,
    };
  }

  const avgWinRate = neighborResults.reduce((s, r) => s + r.train.winRate, 0) / neighborResults.length;
  const avgExpR    = neighborResults.reduce((s, r) => s + r.train.expectancyR, 0) / neighborResults.length;

  // Stability = how close neighbors are to the winner's expectancyR
  const winnerExpR = result.train.expectancyR;
  const stabilityScore = winnerExpR > 0
    ? Math.max(0, Math.min(1, avgExpR / winnerExpR))
    : avgExpR >= 0 ? 1 : 0;

  return {
    nearbyCount:    neighborResults.length,
    nearbyWinRate:  Number(avgWinRate.toFixed(2)),
    nearbyExpR:     Number(avgExpR.toFixed(4)),
    stabilityScore: Number(stabilityScore.toFixed(4)),
    isFragile:      stabilityScore < 0.5,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function updateProgress(pct: number): void {
  state = { ...state, progress: pct };
}
