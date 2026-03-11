import { describe, it, expect } from 'vitest';
import { EventBus } from '../../src/events/eventBus.ts';
import { getMockRawPayload } from '../../src/ingestion/connectors/mockConnector.ts';
import { adaptMockPayloadToMarketEvent } from '../../src/ingestion/adapters/mockAdapter.ts';
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

describe('Paper Trading Validation', () => {
  it('should replay fixed event fixture and produce deterministic pipeline results', async () => {
    const bus = new EventBus();
    startProcessingPipeline(bus);
    startIntelligencePipeline(bus);
    startDecisionPipeline(bus);
    startRiskPipeline(bus);
    startExecutionPipeline(bus);
    startPortfolioPipeline(bus);
    let receivedPositions = 0;
    let receivedPortfolios = 0;
    let receivedExecs = 0;
    bus.subscribe('position.snapshot', snap => { receivedPositions++; });
    bus.subscribe('portfolio.snapshot', snap => { receivedPortfolios++; });
    bus.subscribe('execution.result', snap => { receivedExecs++; });
    FIXTURE_EVENTS.forEach(fixture => {
      const raw = { ...getMockRawPayload(), ...fixture };
      const evt = adaptMockPayloadToMarketEvent(raw);
      publishMarketEvent(bus, evt, 'fixture');
    });
    await new Promise(resolve => setTimeout(resolve, 250));
    expect(receivedPositions).toBeGreaterThan(0);
    expect(receivedPortfolios).toBeGreaterThan(0);
    expect(receivedExecs).toBeGreaterThan(0);
  });
});
