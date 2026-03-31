import { describe, expect, it } from 'vitest';
import { buildProfitabilityLoopSnapshot } from '../../src/performance/profitabilityLoop';

describe('profitabilityLoop', () => {
  it('aggregates profitability, safety, verification, and research into a single snapshot', () => {
    const snapshot = buildProfitabilityLoopSnapshot({
      getPortfolio: () => ({
        equity: 10500,
        pnl: 500,
        trades: [
          { realizedPnL: 100 },
          { realizedPnL: -50 },
          { realizedPnL: 75 },
        ],
      } as any),
      getSignalMetrics: () => ({
        totals: { tracked: 12, active: 2, completed: 10, success: 6, failure: 3, timeout: 1 },
        rates: { successRate: 0.6, failureRate: 0.3, timeoutRate: 0.1 },
        excursions: { avgMfePct: 0.006, avgMaePct: -0.003 },
      } as any),
      getCompletedSignalTracks: () => new Array(10).fill({}),
      getStatus: () => ({
        tradingAllowed: true,
        killSwitch: false,
        activeBlockReason: null,
        drawdownPercent: 1.2,
        dailyLossPercent: 0.3,
        riskOverrideActive: false,
      } as any),
      generateValidationReport: () => ({
        flag: 'CONSISTENT',
        summary: 'Looks good',
        liveTrades: 25,
        backtestTrades: 120,
        hasEnoughLiveData: true,
        tradeFrequencyFlag: 'CONSISTENT',
      } as any),
      getLastResearch: () => ({
        generatedAt: '2026-03-31T00:00:00.000Z',
        attribution: {
          analysisRegime: 'TREND',
          analysisBias: 'LONG',
          analysisConfidence: 0.81,
        },
        fallbackReason: null,
      } as any),
    });

    expect(snapshot.profitability.returnPct).toBe(5);
    expect(snapshot.profitability.winRate).toBeCloseTo(0.666667, 6);
    expect(snapshot.profitability.profitFactor).toBeCloseTo(3.5, 6);
    expect(snapshot.signalQuality.successRate).toBe(0.6);
    expect(snapshot.verification.flag).toBe('CONSISTENT');
    expect(snapshot.research.available).toBe(true);
    expect(snapshot.warnings).toHaveLength(0);
  });

  it('returns partial snapshot with warnings when dependencies fail', () => {
    const snapshot = buildProfitabilityLoopSnapshot({
      getPortfolio: () => {
        throw new Error('portfolio down');
      },
      getSignalMetrics: () => {
        throw new Error('signal down');
      },
      getCompletedSignalTracks: () => [],
      getStatus: () => {
        throw new Error('risk down');
      },
      generateValidationReport: () => {
        throw new Error('validation down');
      },
      getLastResearch: () => {
        throw new Error('research down');
      },
    });

    expect(snapshot.profitability.equity).toBe(10000);
    expect(snapshot.signalQuality.completed).toBe(0);
    expect(snapshot.safety.tradingAllowed).toBe(true);
    expect(snapshot.verification.flag).toBe('UNKNOWN');
    expect(snapshot.research.available).toBe(false);
    expect(snapshot.warnings.length).toBeGreaterThanOrEqual(5);
    expect(snapshot.tuningFocus.length).toBeGreaterThan(0);
  });
});
