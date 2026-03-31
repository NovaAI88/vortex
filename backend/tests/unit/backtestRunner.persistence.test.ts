import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { saveBacktestState } from '../../src/backtest/backtestStateStore';
import { BacktestResult } from '../../src/backtest/backtestTypes';

function sampleResult(runId = 'bt-persisted'): BacktestResult {
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
    finalEquity: 10150,
    totalReturn: 1.5,
    maxDrawdown: 0.8,
    sharpeRatio: 1.4,
    summary: {
      totalTrades: 8,
      wins: 5,
      losses: 3,
      winRate: 62.5,
      totalPnL: 150,
      avgWin: 42,
      avgLoss: -20,
      expectancy: 18,
      profitFactor: 2.2,
      avgR: 0.35,
      expectancyR: 0.24,
    },
    equityCurve: [10000, 10040, 10150],
    trades: [],
    byRegime: [],
    byStrategy: [],
    byExitMode: [],
  };
}

function createTempStateFilePath(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-backtest-runner-'));
  return path.join(dir, 'backtest-state.json');
}

afterEach(() => {
  delete process.env.BACKTEST_STATE_FILE;
});

describe('backtestRunner persistence', () => {
  it('hydrates persisted done state on module initialization', async () => {
    const stateFile = createTempStateFilePath();
    process.env.BACKTEST_STATE_FILE = stateFile;

    saveBacktestState({
      status: 'done',
      progress: 100,
      result: sampleResult(),
    });

    vi.resetModules();
    const runner = await import('../../src/backtest/backtestRunner');
    const state = runner.getBacktestState();
    const meta = runner.getBacktestPersistenceMeta();

    expect(state.status).toBe('done');
    expect(state.result?.runId).toBe('bt-persisted');
    expect(meta.loadedFromDisk).toBe(true);
    expect(meta.stateFilePath).toBe(path.resolve(stateFile));
    expect(meta.lastLoadError).toBeNull();
  });
});
