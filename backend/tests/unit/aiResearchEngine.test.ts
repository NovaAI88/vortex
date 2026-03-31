import { describe, expect, it } from 'vitest';
import { buildFallbackResearchReport, buildResearchReport } from '../../src/intelligence/aiResearchEngine';
import { AIAnalysis } from '../../src/intelligence/aiAnalysisEngine';
import { ProcessedMarketState } from '../../src/models/ProcessedMarketState';
import { MarketEvent } from '../../src/models/MarketEvent';

const marketEvent: MarketEvent = {
  exchange: 'BINANCE',
  symbol: 'BTCUSDT',
  eventType: 'trade',
  price: 70000,
  volume: 1,
  timestamp: '2026-03-31T00:00:00.000Z',
};

const state: ProcessedMarketState = {
  exchange: 'BINANCE',
  symbol: 'BTCUSDT',
  eventType: 'trade',
  price: 70000,
  volume: 1,
  timestamp: '2026-03-31T00:00:00.000Z',
  indicatorsWarm: true,
  newsRiskFlag: false,
  baseEvent: marketEvent,
};

const analysis: AIAnalysis = {
  timestamp: '2026-03-31T00:00:00.000Z',
  regime: 'TREND',
  bias: 'LONG',
  confidence: 0.74,
  regimeConfidence: 0.7,
  volatilityLevel: 0.22,
  leverageBand: 'MEDIUM',
  rationale: ['trend'],
  indicatorsWarm: true,
};

describe('aiResearchEngine', () => {
  it('buildResearchReport returns structured inspectable output', () => {
    const report = buildResearchReport(analysis, state);
    expect(report.status).toBe('ok');
    expect(report.source).toBe('deterministic.v1');
    expect(report.attribution.analysisRegime).toBe('TREND');
    expect(report.attribution.symbol).toBe('BTCUSDT');
    expect(Array.isArray(report.signals)).toBe(true);
    expect(report.signals.length).toBeGreaterThan(0);
  });

  it('buildFallbackResearchReport returns bounded fallback output', () => {
    const report = buildFallbackResearchReport(analysis, state, 'forced_error');
    expect(report.status).toBe('fallback');
    expect(report.fallbackReason).toBe('forced_error');
    expect(report.recommendedAction).toBe('observe');
    expect(report.riskFlags).toContain('research_generation_failure');
  });
});
