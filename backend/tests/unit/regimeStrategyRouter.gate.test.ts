import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../src/events/topics';
import { startRegimeStrategyRouter, resetRouterStateForTesting } from '../../src/intelligence/regimeStrategyRouter';
import { AIAnalysis } from '../../src/intelligence/aiAnalysisEngine';
import { ProcessedMarketState } from '../../src/models/ProcessedMarketState';
import { TradeSignal } from '../../src/models/TradeSignal';

function publishAnalysis(bus: EventBus, regime: 'RANGE' | 'TREND' | 'HIGH_RISK' = 'RANGE'): void {
  const analysis: AIAnalysis = {
    timestamp: new Date().toISOString(),
    regime,
    bias: regime === 'TREND' ? 'LONG' : 'NEUTRAL',
    confidence: 0.8,
    regimeConfidence: 0.8,
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

function primeRangeWindow(bus: EventBus): void {
  // Fill 20-candle window with neutral RSI so rangeLocation is available.
  for (let i = 0; i < 20; i++) {
    publishTick(bus, 100 + i, 50);
  }
  // Reset regimeAge without clearing the price window.
  publishAnalysis(bus, 'TREND');
  publishAnalysis(bus, 'RANGE');
}

describe('regimeStrategyRouter confirmation-tick gate', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetRouterStateForTesting();
  });

  it('1) confirms signal on tick N+1', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 'RANGE');
    primeRangeWindow(bus);

    publishTick(bus, 100, 30); // N: pending buy
    expect(emitted).toHaveLength(0);

    publishTick(bus, 101, 30); // N+1: confirm buy
    expect(emitted).toHaveLength(1);
    expect(emitted[0].signalType).toBe('buy');
  });

  it('2) discards pending when next tick does not confirm', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 'RANGE');
    primeRangeWindow(bus);

    publishTick(bus, 100, 30); // pending buy
    publishTick(bus, 101, 50); // no candidate, pending cleared

    expect(emitted).toHaveLength(0);
  });

  it('3) direction flip discards pending', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 'RANGE');
    primeRangeWindow(bus);

    publishTick(bus, 100, 30); // pending buy
    publishTick(bus, 118, 70); // flip to sell candidate -> pending replaced
    expect(emitted).toHaveLength(0);

    publishTick(bus, 118, 70); // confirm sell
    expect(emitted).toHaveLength(1);
    expect(emitted[0].signalType).toBe('sell');
  });

  it('4) regime switch clears pending', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 'RANGE');
    primeRangeWindow(bus);

    publishTick(bus, 100, 30); // pending buy
    publishAnalysis(bus, 'TREND'); // clear pending
    publishAnalysis(bus, 'RANGE');

    publishTick(bus, 100, 30); // should be pending again (not emit)
    expect(emitted).toHaveLength(0);

    publishTick(bus, 101, 30); // confirm after reset
    expect(emitted).toHaveLength(1);
    expect(emitted[0].signalType).toBe('buy');
  });

  it('5) tick gap invalidates pending', () => {
    const bus = new EventBus();
    const emitted: TradeSignal[] = [];
    startRegimeStrategyRouter(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, e => emitted.push(e.payload as TradeSignal));

    publishAnalysis(bus, 'RANGE');
    primeRangeWindow(bus);

    publishTick(bus, 100, 30); // N: pending buy

    // Simulate a skipped/invalid processing tick that advances internal tickIndex
    // without producing a candidate and without touching pendingRangeSignal.
    bus.publish(EVENT_TOPICS.PROCESSING_STATE, {
      id: `tick-gap-${Math.random()}`,
      topic: EVENT_TOPICS.PROCESSING_STATE,
      timestamp: new Date().toISOString(),
      producer: 'test',
      version: '1.0.0',
      payload: null as any,
    });

    publishTick(bus, 100, 30); // later same-direction candidate, but not N+1
    expect(emitted).toHaveLength(0); // must NOT emit on gap candidate tick

    publishTick(bus, 101, 30); // immediate next tick confirms new pending
    expect(emitted).toHaveLength(1);
    expect(emitted[0].signalType).toBe('buy');
  });
});
