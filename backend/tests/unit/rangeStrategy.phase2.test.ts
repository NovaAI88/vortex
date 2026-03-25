import { describe, it, expect } from 'vitest';
import {
  generateRangeSignalWithDiagnostic,
  RangeRouterContext,
} from '../../src/intelligence/strategies/rangeStrategy';
import { ProcessedMarketState } from '../../src/models/ProcessedMarketState';
import { AIAnalysis } from '../../src/intelligence/aiAnalysisEngine';

function makeState(overrides: Partial<ProcessedMarketState> = {}): ProcessedMarketState {
  return {
    exchange: 'MOCK',
    symbol: 'BTCUSDT',
    eventType: 'trade',
    price: 100,
    volume: 1,
    timestamp: new Date().toISOString(),
    enriched: true,
    baseEvent: {} as any,
    indicatorsWarm: true,
    ema20: 100,
    ema50: 100,
    ema200: null,
    adx14: 20,
    rsi14: 50,
    atr14: 1,
    volatilityLevel: 0.01,
    newsRiskFlag: false,
    ...overrides,
  };
}

function makeAnalysis(overrides: Partial<AIAnalysis> = {}): AIAnalysis {
  return {
    timestamp: new Date().toISOString(),
    regime: 'RANGE',
    bias: 'NEUTRAL',
    confidence: 0.8,
    regimeConfidence: 0.8,
    volatilityLevel: 0.01,
    leverageBand: 'LOW',
    rationale: ['test'],
    indicatorsWarm: true,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<RangeRouterContext> = {}): RangeRouterContext {
  return {
    regimeAge: 3,
    rangeLocation: 0.5,
    ...overrides,
  };
}

describe('rangeStrategy Phase 2 deterministic behavior', () => {
  it('1) reject when rangeLocation is missing', () => {
    const state = makeState({ rsi14: 30 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, {
      regimeAge: 3,
      rangeLocation: null,
    });

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('missing_range_location');
  });

  it('2) reject when buy is blocked above Stage 1 long zone', () => {
    const state = makeState({ rsi14: 30 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.25 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('range_location_blocks_long');
  });

  it('3) reject when sell is blocked below Stage 1 short zone', () => {
    const state = makeState({ rsi14: 70 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.75 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('range_location_blocks_short');
  });

  it('4) emit buy via rsi_extreme', () => {
    const state = makeState({ rsi14: 30 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.05 }));

    expect(res.signal).not.toBeNull();
    expect(res.signal?.signalType).toBe('buy');
    expect(res.rejectionReason).toBeNull();
    expect(res.triggerMode).toBe('rsi_extreme');
  });

  it('5) emit sell via rsi_extreme', () => {
    const state = makeState({ rsi14: 70 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.95 }));

    expect(res.signal).not.toBeNull();
    expect(res.signal?.signalType).toBe('sell');
    expect(res.rejectionReason).toBeNull();
    expect(res.triggerMode).toBe('rsi_extreme');
  });

  it('6) emit buy via context_confirmed (deep-long + RSI<=45)', () => {
    const state = makeState({ rsi14: 44 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.08 }));

    expect(res.signal).not.toBeNull();
    expect(res.signal?.signalType).toBe('buy');
    expect(res.rejectionReason).toBeNull();
    expect(res.triggerMode).toBe('context_confirmed');
  });

  it('7) emit sell via context_confirmed (deep-short + RSI>=55)', () => {
    const state = makeState({ rsi14: 56 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.92 }));

    expect(res.signal).not.toBeNull();
    expect(res.signal?.signalType).toBe('sell');
    expect(res.rejectionReason).toBeNull();
    expect(res.triggerMode).toBe('context_confirmed');
  });

  it('8) reject when ADX >= 25', () => {
    const state = makeState({ adx14: 25, rsi14: 30 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.05 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('adx_too_high');
  });

  it('9) reject when breakout distance is too high', () => {
    const state = makeState({
      price: 104,
      ema20: 100,
      ema50: 100,
      rsi14: 30,
    });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.05 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('breakout_distance_too_high');
  });

  it('10) reject when newsRiskFlag is true', () => {
    const state = makeState({
      newsRiskFlag: true,
      rsi14: 30,
    });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.05 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('news_risk_active');
  });

  it('11) context_confirmed does NOT fire at RSI 46 (buy side guard)', () => {
    const state = makeState({ rsi14: 46 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.08 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('rsi_not_confirmed');
  });

  it('12) context_confirmed sell does NOT fire at RSI 54 (sell side guard)', () => {
    const state = makeState({ rsi14: 54 });
    const analysis = makeAnalysis();
    const res = generateRangeSignalWithDiagnostic(state, analysis, undefined, makeCtx({ rangeLocation: 0.92 }));

    expect(res.signal).toBeNull();
    expect(res.rejectionReason).toBe('rsi_not_confirmed');
  });
});
