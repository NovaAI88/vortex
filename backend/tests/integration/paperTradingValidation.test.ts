import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../src/events/topics';
import { publishMarketEvent } from '../../src/ingestion/publishers/marketEventPublisher';
import { startProcessingPipeline } from '../../src/processing/processingPipeline';
import { startIntelligencePipeline } from '../../src/intelligence/intelligencePipeline';
import { startDecisionPipeline } from '../../src/decision/decisionPipeline';
import { startRiskPipeline } from '../../src/risk/riskPipeline';
import { startExecutionPipeline } from '../../src/execution/executionPipeline';
import { startPortfolioPipeline } from '../../src/portfolio/portfolioPipeline';
import { resetPortfolio } from '../../src/portfolio/state/portfolioLedger';
import { resetRiskState } from '../../src/risk/globalRiskController';
import { setEngineMode, EngineMode } from '../../src/execution/mode/executionMode';
import { resumeEngine } from '../../src/state/engineState';

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
    resetPortfolio();
    resetRiskState();
    setEngineMode(EngineMode.PAPER_TRADING);
    resumeEngine();
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
    // Subscribe to canonical downstream topic strings emitted by current publishers
    bus.subscribe('execution.result', () => { receivedExecs++; });
    bus.subscribe('position.snapshot', () => { receivedPositions++; });
    bus.subscribe('portfolio.snapshot', () => { receivedPortfolios++; });
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
