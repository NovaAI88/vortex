import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/events/eventBus.ts';
import { EVENT_TOPICS } from '../../src/events/topics.ts';
import { publishMarketEvent } from '../../src/ingestion/publishers/marketEventPublisher.ts';
import { startProcessingPipeline } from '../../src/processing/processingPipeline.ts';
import { startIntelligencePipeline } from '../../src/intelligence/intelligencePipeline.ts';
import { startDecisionPipeline } from '../../src/decision/decisionPipeline.ts';
import { startRiskPipeline } from '../../src/risk/riskPipeline.ts';
import { startExecutionPipeline } from '../../src/execution/executionPipeline.ts';
import { startPortfolioPipeline } from '../../src/portfolio/portfolioPipeline.ts';

const FIXTURE_EVENTS = [
  { price: 9000, movingAvg: 9500, symbol: 'BTCUSDT', side: 'buy' },
  { price: 9600, movingAvg: 9500, symbol: 'BTCUSDT', side: 'sell' },
  { price: 9550, movingAvg: 9600, symbol: 'BTCUSDT', side: 'buy' }
];

function asValidMarketEvent(fixture, i) {
  const now = new Date(Date.now() + i * 100).toISOString();
  return {
    exchange: 'MOCK',
    symbol: fixture.symbol,
    eventType: 'trade',
    price: fixture.price,
    volume: 0.101,
    timestamp: now,
    raw: {
      ...fixture,
      mock: true,
      timestamp: now
    }
  };
}

describe('Paper Trading Validation', () => {
  it('should replay fixed event fixture and produce deterministic pipeline results', async () => {
    const bus = new EventBus();
    startProcessingPipeline(bus);
    startIntelligencePipeline(bus);
    startDecisionPipeline(bus);
    startRiskPipeline(bus);
    startExecutionPipeline(bus);
    startPortfolioPipeline(bus);
    let processedStates = 0;
    let tradeSignals = 0;
    let actionCandidates = 0;
    let riskDecisions = 0;
    let receivedExecs = 0;
    let receivedPositions = 0;
    let receivedPortfolios = 0;
    bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, () => { processedStates++; });
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, () => { tradeSignals++; });
    bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE, () => { actionCandidates++; });
    bus.subscribe(EVENT_TOPICS.RISK_DECISION, () => { riskDecisions++; });
    bus.subscribe(EVENT_TOPICS.EXECUTION_RESULT, () => { receivedExecs++; });
    bus.subscribe(EVENT_TOPICS.POSITION_SNAPSHOT, () => { receivedPositions++; });
    bus.subscribe(EVENT_TOPICS.PORTFOLIO_SNAPSHOT, () => { receivedPortfolios++; });
    FIXTURE_EVENTS.forEach((fixture, i) => {
      const evt = asValidMarketEvent(fixture, i);
      publishMarketEvent(bus, evt, 'fixture');
    });
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Log all step counts
    console.log({processedStates, tradeSignals, actionCandidates, riskDecisions, receivedExecs, receivedPositions, receivedPortfolios});
    expect(processedStates).toBeGreaterThan(0);
    expect(tradeSignals).toBeGreaterThan(0);
    expect(actionCandidates).toBeGreaterThan(0);
    expect(riskDecisions).toBeGreaterThan(0);
    expect(receivedExecs).toBeGreaterThan(0);
    expect(receivedPositions).toBeGreaterThan(0);
    expect(receivedPortfolios).toBeGreaterThan(0);
  });
});
