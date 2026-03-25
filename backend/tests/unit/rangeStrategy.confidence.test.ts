import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../src/events/topics';
import { AIAnalysis } from '../../src/intelligence/aiAnalysisEngine';
import { startRegimeStrategyRouter, resetRouterStateForTesting } from '../../src/intelligence/regimeStrategyRouter';
import { ProcessedMarketState } from '../../src/models/ProcessedMarketState';
import { TradeSignal } from '../../src/models/TradeSignal';

function publishAnalysis(bus: EventBus, confidence = 0.9, regime: 'RANGE' | 'TREND' | 'HIGH_RISK' = 'RANGE'): void {
  const analysis: AIAnalysis = {
    timestamp: new Date().toISOString(),
    regime,
    bias: regime === 'TREND' ? 'LONG' : 'NEUTRAL',
    confidence,
    regimeConfidence: confidence,
    volatilityLevel: 0.01,
    leverageBand: 'LOW',
    rationale: ['test'],
    indicatorsWarm: true,
  };

  bus.publish(EVENT_TOPICS.AI_ANALYSIS, {
    id: `ai-${Math.random()}`,
    topic: EVENT_TOPICS.AI_ANALYSIS,
    timestamp: new Date().toISOString(),
    producer: 'test',
    version: '1.0.0',
    payload: analysis,
  });
}

function publishTick(bus: EventBus, price: number, rsi14: number): void {
  const state: ProcessedMarketState = {
    exchange: 'MOCK',
    symbol: 'BTCUSDT',
    eventType: 'trade',
    price,
    volume: 1,
    timestamp: new Date().toISOString(),
    enriched: true,
    baseEvent: {} as any,
    indicatorsWarm: true,
    ema20: price,
    ema50: price,
    ema200: null,
    adx14: 20,
    rsi14,
    atr14: 1,
    volatilityLevel: 0.01,
    newsRiskFlag: false,
    candleHigh: price,
    candleLow: price,
  };

  bus.publish(EVENT_TOPICS.PROCESSING_STATE, {
    id: `tick-${Math.random()}`,
    topic: EVENT_TOPICS.PROCESSING_STATE,
    timestamp: new Date().toISOString(),
    producer: 'test',
    version: '1.0.0',
    payload: state,
  });
}

function primeRangeWindow(bus: EventBus, confidence = 0.9): void {
  for (let i = 0; i < 20; i++) {
    publishTick(bus, 100 + i, 50);
  }
  // Reset regimeAge without clearing the price window.
  publishAnalysis(bus, confidence, 'TREND');
  publishAnalysis(bus, confidence, 'RANGE');
}

describe('RANGE confidence routing + metadata emission', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetRouterStateForTesting();
  });

  it('rsi_extreme uses full analysis confidence and emits metadata', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 0.9);
    primeRangeWindow(bus);

    publishTick(bus, 100, 30); // pending buy via rsi_extreme
    publishTick(bus, 101, 30); // confirm

    expect(emitted).toHaveLength(1);
    expect(emitted[0].triggerMode).toBe('rsi_extreme');
    expect(emitted[0].confidence).toBe(0.9);
    expect(emitted[0].rsi14AtSignal).toBe(30);
    expect(emitted[0].rangeLocationAtSignal).not.toBeNull();
  });

  it('context_confirmed applies 0.80 confidence discount and emits metadata', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 0.9);
    primeRangeWindow(bus);

    publishTick(bus, 100, 44); // pending buy via context_confirmed (deep zone + RSI<=45)
    publishTick(bus, 100, 44); // confirm

    expect(emitted).toHaveLength(1);
    expect(emitted[0].triggerMode).toBe('context_confirmed');
    expect(emitted[0].confidence).toBe(0.72);
    expect(emitted[0].rsi14AtSignal).toBe(44);
    expect(emitted[0].rangeLocationAtSignal).not.toBeNull();
  });
});
