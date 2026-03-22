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
import { BacktestConfig, BacktestState, BacktestResult, DEFAULT_CONFIG, BacktestTrade } from './backtestTypes';

// ─── In-memory state ───────────────────────────────────────────────────────

let state: BacktestState = { status: 'idle' };

export function getBacktestState(): BacktestState {
  return state;
}

export function getBacktestResult(): BacktestResult | null {
  return state.result ?? null;
}

// ─── Runner ────────────────────────────────────────────────────────────────

export async function startBacktest(userConfig: Partial<BacktestConfig>): Promise<string> {
  if (state.status === 'running') {
    throw new Error('A backtest is already running');
  }

  const config: BacktestConfig = { ...DEFAULT_CONFIG, ...userConfig, symbol: 'BTCUSDT' };
  const runId = `bt-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  // Mark running immediately (synchronous)
  state = { status: 'running', progress: 0 };

  // Execute async — result flows into state when done
  executeBacktest(runId, config).catch(err => {
    state = { status: 'error', error: String(err?.message ?? err) };
  });

  return runId;
}

async function executeBacktest(runId: string, config: BacktestConfig): Promise<void> {
  const startTime = new Date().toISOString();
  const t0        = Date.now();

  try {
    // ── Step 1: Fetch candles ────────────────────────────────────────────
    state = { status: 'running', progress: 5 };
    const candles = await fetchHistoricalCandles({
      symbol:   config.symbol,
      interval: config.interval,
      limit:    config.limit,
    });

    // ── Step 2: Build replay states ──────────────────────────────────────
    state = { status: 'running', progress: 20 };
    const replayStates = buildReplayStates(candles);

    // ── Step 3: Simulate ─────────────────────────────────────────────────
    state = { status: 'running', progress: 40 };

    let allTrades: BacktestTrade[];
    let equityCurve: number[];

    if (config.exitMode === 'both') {
      // Run ATR mode (primary for overall metrics)
      const atrResult = runSimulation(replayStates, { ...config, exitMode: 'atr' });

      // Run fixed mode
      const fixedResult = runSimulation(replayStates, { ...config, exitMode: 'fixed' });

      // Merge trade lists — tag trades from fixed run (exitSource already set by simulator)
      allTrades   = [...atrResult.trades, ...fixedResult.trades];
      equityCurve = atrResult.equityCurve; // primary curve = ATR run
    } else {
      const simResult = runSimulation(replayStates, config);
      allTrades   = simResult.trades;
      equityCurve = simResult.equityCurve;
    }

    // ── Step 4: Metrics ──────────────────────────────────────────────────
    state = { status: 'running', progress: 85 };

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
    state = { status: 'done', progress: 100, result };

  } catch (err: any) {
    state = { status: 'error', error: String(err?.message ?? err) };
    throw err;
  }
}
