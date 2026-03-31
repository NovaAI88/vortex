// VORTEX — Backtest Runner (Phase 5)
//
// Orchestrates the full backtest pipeline:
//   1. Fetch historical candles (Binance REST)
//   2. Build replay states (historicalFeatureBuilder)
//   3. Run simulation (backtestSimulator)
//   4. Compute metrics (backtestMetrics)
//   5. Store result in memory for API retrieval
//
// Run is asynchronous. Status is tracked via BacktestState.
//
// For exitMode = 'both':
//   Runs two simulations (atr + fixed) over the same candle series.
//   Results are stored as two entries in byExitMode breakdown.
//   Overall metrics reflect the ATR run (primary).

import { fetchHistoricalCandles } from './historicalDataFetcher';
import { buildReplayStates }      from './historicalFeatureBuilder';
import { runSimulation }          from './backtestSimulator';
import { computeBacktestMetrics } from './backtestMetrics';
import { analyzeEntryQuality }    from './entryQualityAnalyzer';
import { BacktestConfig, BacktestState, BacktestResult, DEFAULT_CONFIG, BacktestTrade } from './backtestTypes';
import { ParamSet, DEFAULT_PARAMS } from '../optimization/optimizationTypes';
import {
  getBacktestStateFilePath,
  loadBacktestState,
  saveBacktestState,
} from './backtestStateStore';

// ─── In-memory state ───────────────────────────────────────────────────────

import { ProcessedMarketState } from '../models/ProcessedMarketState';

export interface BacktestPersistenceMeta {
  stateFilePath: string;
  loadedFromDisk: boolean;
  lastLoadedAt: string | null;
  lastSavedAt: string | null;
  lastLoadError: string | null;
}

const loaded = loadBacktestState();
let state: BacktestState = loaded.state;
let lastReplayStates: ProcessedMarketState[] = [];
const persistenceMeta: BacktestPersistenceMeta = {
  stateFilePath: getBacktestStateFilePath(),
  loadedFromDisk: loaded.loadedFromDisk,
  lastLoadedAt: new Date().toISOString(),
  lastSavedAt: null,
  lastLoadError: loaded.loadError,
};

function setBacktestState(next: BacktestState, persist = false): void {
  state = next;
  if (!persist) return;
  try {
    saveBacktestState(state);
    persistenceMeta.lastSavedAt = new Date().toISOString();
  } catch (err: any) {
    console.error('[VORTEX] Failed to persist backtest state:', err);
  }
}

export function getLastReplayStates(): ProcessedMarketState[] {
  return lastReplayStates;
}

export function getBacktestState(): BacktestState {
  return state;
}

export function getBacktestResult(): BacktestResult | null {
  return state.result ?? null;
}

export function getBacktestPersistenceMeta(): BacktestPersistenceMeta {
  return { ...persistenceMeta };
}

// ─── Runner ────────────────────────────────────────────────────────────────

export async function startBacktest(
  userConfig: Partial<BacktestConfig>,
  params:     ParamSet = DEFAULT_PARAMS,
): Promise<string> {
  if (state.status === 'running') {
    throw new Error('A backtest is already running');
  }

  const config: BacktestConfig = { ...DEFAULT_CONFIG, ...userConfig, symbol: 'BTCUSDT' };
  const runId = `bt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  // Mark running immediately (synchronous)
  setBacktestState({ status: 'running', progress: 0 }, false);

  // Execute async — result flows into state when done
  executeBacktest(runId, config, params).catch(err => {
    setBacktestState({ status: 'error', error: String(err?.message ?? err) }, true);
  });

  return runId;
}

async function executeBacktest(runId: string, config: BacktestConfig, params: ParamSet = DEFAULT_PARAMS): Promise<void> {
  const startTime = new Date().toISOString();
  const t0        = Date.now();

  try {
    // ── Step 1: Fetch candles ────────────────────────────────────────────
    setBacktestState({ status: 'running', progress: 5 }, false);
    const candles = await fetchHistoricalCandles({
      symbol:   config.symbol,
      interval: config.interval,
      limit:    config.limit,
    });

    // ── Step 2: Build replay states (with Phase 7A diagnostic extensions) ─
    setBacktestState({ status: 'running', progress: 20 }, false);
    const { states: replayStates, extensions } = buildReplayStates(candles, true);

    // ── Step 3: Simulate ─────────────────────────────────────────────────
    setBacktestState({ status: 'running', progress: 40 }, false);

    let allTrades: BacktestTrade[];
    let equityCurve: number[];

    if (config.exitMode === 'both') {
      // Run ATR mode (primary for overall metrics)
      const atrResult = runSimulation(replayStates, { ...config, exitMode: 'atr' }, params, extensions);

      // Run fixed mode
      const fixedResult = runSimulation(replayStates, { ...config, exitMode: 'fixed' }, params, extensions);

      // Merge trade lists — tag trades from fixed run (exitSource already set by simulator)
      allTrades   = [...atrResult.trades, ...fixedResult.trades];
      equityCurve = atrResult.equityCurve; // primary curve = ATR run
    } else {
      const simResult = runSimulation(replayStates, config, params, extensions);
      allTrades   = simResult.trades;
      equityCurve = simResult.equityCurve;
    }

    // ── Phase 7A: store replay states + run entry quality analysis ────────
    lastReplayStates = replayStates;
    analyzeEntryQuality(allTrades); // mutates quickStop field on each trade

    // ── Step 4: Metrics ──────────────────────────────────────────────────
    setBacktestState({ status: 'running', progress: 85 }, false);

    const endTime  = new Date().toISOString();
    const duration = Date.now() - t0;

    const result = computeBacktestMetrics(
      allTrades,
      equityCurve,
      config,
      runId,
      startTime,
      endTime,
      duration,
    );

    // ── Step 5: Store ────────────────────────────────────────────────────
    setBacktestState({ status: 'done', progress: 100, result }, true);

  } catch (err: any) {
    setBacktestState({ status: 'error', error: String(err?.message ?? err) }, true);
    throw err;
  }
}
