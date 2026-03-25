import { beforeEach, describe, expect, it } from 'vitest';
import {
  getActiveSignalTracks,
  getCompletedSignalTracks,
  getSignalMetrics,
  resetSignalOutcomeTrackerForTesting,
  trackSignal,
  updateSignalOutcomesForTick,
} from '../../src/performance/signalOutcomeTracker';

describe('signalOutcomeTracker', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetSignalOutcomeTrackerForTesting();
  });

  it('tracks signal using TradeSignal.id as key', () => {
    trackSignal({
      signalId: 'sig-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 10,
      triggerMode: 'rsi_extreme',
      confidence: 0.8,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.08,
    });

    const active = getActiveSignalTracks();
    expect(active).toHaveLength(1);
    expect(active[0].signalId).toBe('sig-1');
  });

  it('rejects duplicate active insert for same signalId', () => {
    trackSignal({
      signalId: 'dup-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 1,
      triggerMode: 'rsi_extreme',
      confidence: 0.8,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.05,
    });

    expect(() => {
      trackSignal({
        signalId: 'dup-1',
        symbol: 'BTCUSDT',
        side: 'sell',
        entryPrice: 100,
        entryTick: 2,
        triggerMode: 'context_confirmed',
        confidence: 0.7,
        rsi14AtSignal: 60,
        rangeLocationAtSignal: 0.9,
      });
    }).toThrow(/Duplicate active signalId rejected/);

    expect(getActiveSignalTracks()).toHaveLength(1);
  });

  it('buy resolves success at +0.5%', () => {
    trackSignal({
      signalId: 'buy-success',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'rsi_extreme',
      confidence: 0.9,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.05,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.5, tickIndex: 1 });

    expect(getActiveSignalTracks()).toHaveLength(0);
    const done = getCompletedSignalTracks();
    expect(done).toHaveLength(1);
    expect(done[0].outcome).toBe('success');
  });

  it('buy resolves failure at -0.75%', () => {
    trackSignal({
      signalId: 'buy-fail',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'rsi_extreme',
      confidence: 0.9,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.05,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 99.25, tickIndex: 1 });

    expect(getCompletedSignalTracks()[0].outcome).toBe('failure');
  });

  it('sell resolves success with favorable downward move', () => {
    trackSignal({
      signalId: 'sell-success',
      symbol: 'BTCUSDT',
      side: 'sell',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'context_confirmed',
      confidence: 0.72,
      rsi14AtSignal: 56,
      rangeLocationAtSignal: 0.92,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 99.5, tickIndex: 1 });

    expect(getCompletedSignalTracks()[0].outcome).toBe('success');
  });

  it('sell resolves failure with adverse upward move', () => {
    trackSignal({
      signalId: 'sell-failure',
      symbol: 'BTCUSDT',
      side: 'sell',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'context_confirmed',
      confidence: 0.72,
      rsi14AtSignal: 56,
      rangeLocationAtSignal: 0.92,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.75, tickIndex: 1 });

    expect(getCompletedSignalTracks()[0].outcome).toBe('failure');
  });

  it('resolution order is success then failure then timeout', () => {
    trackSignal({
      signalId: 'order-check',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: null,
      confidence: 0.5,
      rsi14AtSignal: null,
      rangeLocationAtSignal: null,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.5, tickIndex: 10 });

    const done = getCompletedSignalTracks();
    expect(done).toHaveLength(1);
    expect(done[0].outcome).toBe('success');
  });

  it('timeout resolves when ticksElapsed >= 10 without thresholds hit', () => {
    trackSignal({
      signalId: 'timeout-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: null,
      confidence: 0.4,
      rsi14AtSignal: null,
      rangeLocationAtSignal: null,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.1, tickIndex: 9 });
    expect(getActiveSignalTracks()).toHaveLength(1);

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.1, tickIndex: 10 });
    expect(getCompletedSignalTracks()[0].outcome).toBe('timeout');
  });

  it('updates mfe and mae correctly before resolution', () => {
    trackSignal({
      signalId: 'mfe-mae',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'rsi_extreme',
      confidence: 0.8,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.05,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.2, tickIndex: 1 });
    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 99.8, tickIndex: 2 });

    const active = getActiveSignalTracks()[0];
    expect(active.mfePct).toBeCloseTo(0.002, 6);
    expect(active.maePct).toBeCloseTo(-0.002, 6);
  });

  it('updates only matching symbol', () => {
    trackSignal({
      signalId: 'sym-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: null,
      confidence: 0.6,
      rsi14AtSignal: null,
      rangeLocationAtSignal: null,
    });

    updateSignalOutcomesForTick({ symbol: 'ETHUSDT', price: 200, tickIndex: 20 });

    expect(getActiveSignalTracks()).toHaveLength(1);
    expect(getCompletedSignalTracks()).toHaveLength(0);
  });

  it('completedSignals trims immediately to cap=1000', () => {
    for (let i = 0; i < 1001; i++) {
      trackSignal({
        signalId: `cap-${i}`,
        symbol: 'BTCUSDT',
        side: 'buy',
        entryPrice: 100,
        entryTick: i,
        triggerMode: null,
        confidence: 0.5,
        rsi14AtSignal: null,
        rangeLocationAtSignal: null,
      });
      updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.5, tickIndex: i + 1 });
    }

    const done = getCompletedSignalTracks();
    expect(done).toHaveLength(1000);
    expect(done[0].signalId).toBe('cap-1');
  });

  it('activeSignals are never auto-trimmed', () => {
    for (let i = 0; i < 1100; i++) {
      trackSignal({
        signalId: `active-${i}`,
        symbol: 'BTCUSDT',
        side: 'buy',
        entryPrice: 100,
        entryTick: i,
        triggerMode: null,
        confidence: 0.5,
        rsi14AtSignal: null,
        rangeLocationAtSignal: null,
      });
    }

    expect(getActiveSignalTracks()).toHaveLength(1100);
  });

  it('getSignalMetrics returns tracked = active + completed and mode averages', () => {
    trackSignal({
      signalId: 'm1',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'rsi_extreme',
      confidence: 0.8,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.05,
    });

    trackSignal({
      signalId: 'm2',
      symbol: 'ETHUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 0,
      triggerMode: 'context_confirmed',
      confidence: 0.7,
      rsi14AtSignal: 44,
      rangeLocationAtSignal: 0.08,
    });

    updateSignalOutcomesForTick({ symbol: 'BTCUSDT', price: 100.5, tickIndex: 1 }); // m1 success
    // m2 remains active

    const metrics = getSignalMetrics();
    expect(metrics.totals.tracked).toBe(metrics.totals.active + metrics.totals.completed);
    expect(metrics.totals.completed).toBe(1);
    expect(metrics.totals.active).toBe(1);
    expect(metrics.avgMfePctByTriggerMode.rsi_extreme).toBeGreaterThanOrEqual(0.005);
    expect(metrics.avgMaePctByTriggerMode.rsi_extreme).toBeGreaterThanOrEqual(0);
  });

  it('resetSignalOutcomeTrackerForTesting throws outside test mode', () => {
    process.env.NODE_ENV = 'production';
    expect(() => resetSignalOutcomeTrackerForTesting()).toThrow(/test-only/);
  });
});
