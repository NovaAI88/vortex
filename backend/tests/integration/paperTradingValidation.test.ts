// Phase 3 update: intelligencePipeline no longer emits signals.
// regimeStrategyRouter is the sole signal producer.
//
// This test publishes warm ProcessedMarketState events directly to PROCESSING_STATE
// (bypassing the ingestion/enrichment chain) and seeds a committed AIAnalysis
// directly on the bus (bypassing the 3-tick stability gate).
// Both are correct test isolation patterns — each pipeline layer has its own unit test.

import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../src/events/topics';
import { startRegimeStrategyRouter } from '../../src/intelligence/regimeStrategyRouter';
import { startDecisionPipeline } from '../../src/decision/decisionPipeline';
import { startRiskPipeline } from '../../src/risk/riskPipeline';
import { startExecutionPipeline } from '../../src/execution/executionPipeline';
import { startPortfolioPipeline } from '../../src/portfolio/portfolioPipeline';
import { resetPortfolio } from '../../src/portfolio/state/portfolioLedger';
import { resetRiskState } from '../../src/risk/globalRiskController';
import { setEngineMode, EngineMode } from '../../src/execution/mode/executionMode';
import { resumeEngine } from '../../src/state/engineState';
import { AIAnalysis } from '../../src/intelligence/aiAnalysisEngine';
import { ProcessedMarketState } from '../../src/intelligence/../models/ProcessedMarketState';
import { EventEnvelope } from '../../src/events/eventEnvelope';

// ── Warm ProcessedMarketState fixture ────────────────────────────────────────
// BTC at 95800, EMA20=96200 → price is 0.42% below EMA20 (pullback zone: 0.3%–2.5% ✓)
// EMA stack: 96200 > 95000 > 90000 → bullish ✓
// ADX=44 (strong), RSI=52 (not overextended), no news risk
// Directional check: price (95800) < ema20 * 1.003 (96489) ✓

const BASE_PRICE = 95800;
const BASE_STATE: ProcessedMarketState = {
  exchange:        'MOCK',
  symbol:          'BTCUSDT',
  eventType:       'trade',
  price:           BASE_PRICE,
  volume:          0.101,
  timestamp:       new Date().toISOString(),
  enriched:        true,
  baseEvent:       { exchange: 'MOCK', symbol: 'BTCUSDT', eventType: 'trade', price: BASE_PRICE, volume: 0.101, timestamp: new Date().toISOString(), raw: {} } as any,
  indicatorsWarm:  true,
  ema20:           96200,   // price (95800) is 0.42% below EMA20 → in pullback window ✓
  ema50:           95000,   // ema20 > ema50 ✓
  ema200:          90000,   // ema50 > ema200 → full bull stack ✓
  adx14:           44.0,    // >= 25 ✓
  rsi14:           52.0,    // < 75 (LONG guard) ✓
  atr14:           800,
  volatilityLevel: 0.013,
  newsRiskFlag:    false,
};

// Pre-seeded AI analysis — TREND/LONG, warm
// confidence=0.75 — must be >= 0.7 to pass basicSignalEvaluator gate
const SEED_ANALYSIS: AIAnalysis = {
  timestamp:        new Date().toISOString(),
  regime:           'TREND',
  bias:             'LONG',
  confidence:       0.75,
  regimeConfidence: 0.88,
  volatilityLevel:  0.013,
  leverageBand:     'HIGH',
  rationale:        ['Uptrend: EMA stack bullish, ADX=44.0', 'Bias: LONG (price vs EMA200 + RSI)', 'Confidence: 75.0% | Leverage: HIGH'],
  indicatorsWarm:   true,
};

function publishEnvelope<T>(bus: EventBus, topic: string, payload: T, producer: string): void {
  const envelope: EventEnvelope<T> = {
    id:        (Math.random() * 1e17).toString(36),
    topic,
    timestamp: new Date().toISOString(),
    producer,
    version:   '1.0.0',
    payload,
  };
  bus.publish(topic, envelope);
}

describe('Paper Trading Validation', () => {
  it('should replay fixed event fixture and produce deterministic pipeline results', async () => {
    resetPortfolio();
    resetRiskState();
    setEngineMode(EngineMode.PAPER_TRADING);
    resumeEngine();

    const bus = new EventBus();

    // Start pipelines — regime router is sole signal producer (no processing pipeline needed)
    startRegimeStrategyRouter(bus);
    startDecisionPipeline(bus);
    startRiskPipeline(bus);
    startExecutionPipeline(bus);
    startPortfolioPipeline(bus);

    let processedStates  = 0;
    let tradeSignals     = 0;
    let actionCandidates = 0;
    let riskDecisions    = 0;
    let receivedExecs    = 0;
    let receivedPositions  = 0;
    let receivedPortfolios = 0;

    bus.subscribe(EVENT_TOPICS.PROCESSING_STATE,   () => { processedStates++; });
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, () => { tradeSignals++; });
    bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE,  () => { actionCandidates++; });
    bus.subscribe(EVENT_TOPICS.RISK_DECISION,       () => { riskDecisions++; });
    bus.subscribe('execution.result',               () => { receivedExecs++; });
    bus.subscribe('position.snapshot',              () => { receivedPositions++; });
    bus.subscribe('portfolio.snapshot',             () => { receivedPortfolios++; });

    // Step 1: seed AI analysis so regime router has a committed regime
    publishEnvelope(bus, EVENT_TOPICS.AI_ANALYSIS, SEED_ANALYSIS, 'test-fixture');

    // Step 2: publish warm ProcessedMarketState directly (bypasses ingestion/enrichment)
    for (let i = 0; i < 3; i++) {
      const state = { ...BASE_STATE, timestamp: new Date(Date.now() + i * 100).toISOString() };
      publishEnvelope(bus, EVENT_TOPICS.PROCESSING_STATE, state, 'test-fixture');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log({ processedStates, tradeSignals, actionCandidates, riskDecisions, receivedExecs, receivedPositions, receivedPortfolios });

    expect(processedStates).toBeGreaterThan(0);
    expect(tradeSignals).toBeGreaterThan(0);
    expect(actionCandidates).toBeGreaterThan(0);
    expect(riskDecisions).toBeGreaterThan(0);
    expect(receivedExecs).toBeGreaterThan(0);
    expect(receivedPositions).toBeGreaterThan(0);
    expect(receivedPortfolios).toBeGreaterThan(0);
  });
});
