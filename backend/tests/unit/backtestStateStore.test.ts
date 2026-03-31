import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getBacktestStateFilePath,
  loadBacktestState,
  saveBacktestState,
} from '../../src/backtest/backtestStateStore';
import { BacktestResult } from '../../src/backtest/backtestTypes';

function sampleResult(runId = 'bt-sample'): BacktestResult {
  return {
    runId,
    config: {
      symbol: 'BTCUSDT',
      interval: '1m',
      limit: 500,
      initialCapital: 10000,
      positionSizePct: 0.1,
      exitMode: 'atr',
      riskPerTrade: 0.01,
      strategyMode: 'both',
    },
    startTime: '2026-03-31T00:00:00.000Z',
    endTime: '2026-03-31T00:01:00.000Z',
    durationMs: 60000,
    candlesUsed: 500,
    initialCapital: 10000,
    finalEquity: 10200,
    totalReturn: 2,
    maxDrawdown: 1.2,
    sharpeRatio: 1.1,
    summary: {
      totalTrades: 10,
      wins: 6,
      losses: 4,
      winRate: 60,
      totalPnL: 200,
      avgWin: 50,
      avgLoss: -25,
      expectancy: 20,
      profitFactor: 2,
      avgR: 0.3,
      expectancyR: 0.2,
    },
    equityCurve: [10000, 10050, 10200],
    trades: [],
    byRegime: [],
    byStrategy: [],
    byExitMode: [],
  };
}

function createTempStateFilePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-backtest-state-'));
  return path.join(dir, 'backtest-state.json');
}

afterEach(() => {
  delete process.env.BACKTEST_STATE_FILE;
});

describe('backtestStateStore', () => {
  it('saves and loads a done state', () => {
    const stateFile = createTempStateFilePath();
    process.env.BACKTEST_STATE_FILE = stateFile;

    saveBacktestState({
      status: 'done',
      progress: 100,
      result: sampleResult('bt-roundtrip'),
    });

    const loaded = loadBacktestState();
    expect(getBacktestStateFilePath()).toBe(path.resolve(stateFile));
    expect(loaded.loadedFromDisk).toBe(true);
    expect(loaded.loadError).toBeNull();
    expect(loaded.state.status).toBe('done');
    expect(loaded.state.result?.runId).toBe('bt-roundtrip');
  });

  it('falls back to idle state on invalid JSON', () => {
    const stateFile = createTempStateFilePath();
    process.env.BACKTEST_STATE_FILE = stateFile;
    fs.writeFileSync(stateFile, '{invalid-json', 'utf8');

    const loaded = loadBacktestState();
    expect(loaded.loadedFromDisk).toBe(false);
    expect(loaded.state.status).toBe('idle');
    expect(loaded.loadError).toBeTruthy();
  });
});
