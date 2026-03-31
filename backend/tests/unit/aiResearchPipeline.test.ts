import { describe, expect, it, beforeEach } from 'vitest';
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../src/events/topics';
import { AIAnalysis } from '../../src/intelligence/aiAnalysisEngine';
import {
  getLastResearch,
  resetResearchPipelineStateForTesting,
  startAIResearchPipeline,
} from '../../src/intelligence/aiResearchPipeline';
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
  regime: 'RANGE',
  bias: 'NEUTRAL',
  confidence: 0.61,
  regimeConfidence: 0.64,
  volatilityLevel: 0.2,
  leverageBand: 'MEDIUM',
  rationale: ['range'],
  indicatorsWarm: true,
};

describe('aiResearchPipeline', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetResearchPipelineStateForTesting();
  });

  it('publishes structured research after analysis + market state', () => {
    const bus = new EventBus();
    const events: any[] = [];
    startAIResearchPipeline(bus);

    bus.subscribe(EVENT_TOPICS.AI_RESEARCH, envelope => {
      events.push(envelope.payload);
    });

    bus.publish(EVENT_TOPICS.AI_ANALYSIS, { payload: analysis } as any);
    bus.publish(EVENT_TOPICS.PROCESSING_STATE, { payload: state } as any);

    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('ok');
    expect(events[0].attribution.analysisRegime).toBe('RANGE');
    expect(getLastResearch()?.status).toBe('ok');
  });

  it('publishes fallback research when generator throws', () => {
    const bus = new EventBus();
    const events: any[] = [];
    startAIResearchPipeline(bus, {
      generateReport: () => {
        throw new Error('test_failure');
      },
    });

    bus.subscribe(EVENT_TOPICS.AI_RESEARCH, envelope => {
      events.push(envelope.payload);
    });

    bus.publish(EVENT_TOPICS.AI_ANALYSIS, { payload: analysis } as any);
    bus.publish(EVENT_TOPICS.PROCESSING_STATE, { payload: state } as any);

    expect(events).toHaveLength(1);
    expect(events[0].status).toBe('fallback');
    expect(events[0].fallbackReason).toContain('test_failure');
    expect(getLastResearch()?.status).toBe('fallback');
  });
});
