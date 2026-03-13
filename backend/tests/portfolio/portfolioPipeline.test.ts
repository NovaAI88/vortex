// Portfolio Pipeline Test: ExecutionResult → Portfolio/Position Snapshot (dedup logic)
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../../src/events/topics';
import { getMockRawPayload } from '../../../src/ingestion/connectors/mockConnector';
import { adaptMockPayloadToMarketEvent } from '../../../src/ingestion/adapters/mockAdapter';
import { publishMarketEvent } from '../../../src/ingestion/publishers/marketEventPublisher';
import { startProcessingPipeline } from '../../../src/processing/processingPipeline';
import { startIntelligencePipeline } from '../../../src/intelligence/intelligencePipeline';
import { startDecisionPipeline } from '../../../src/decision/decisionPipeline';
import { startRiskPipeline } from '../../../src/risk/riskPipeline';
import { startExecutionPipeline } from '../../../src/execution/executionPipeline';
import { startPortfolioPipeline } from '../../../src/portfolio/portfolioPipeline';

describe('Portfolio Pipeline', () => {
  it('should update and emit portfolio/position snapshot for unique execution', done => {
    const bus = new EventBus();
    startProcessingPipeline(bus);
    startIntelligencePipeline(bus);
    startDecisionPipeline(bus);
    startRiskPipeline(bus);
    startExecutionPipeline(bus);
    startPortfolioPipeline(bus);

    let positionSnaps = 0, portfolioSnaps = 0;
    bus.subscribe('position.snapshot', () => positionSnaps++);
    bus.subscribe('portfolio.snapshot', () => portfolioSnaps++);

    const raw = getMockRawPayload();
    raw.price = 9000; raw.movingAvg = 9500;
    const evt = adaptMockPayloadToMarketEvent(raw);
    publishMarketEvent(bus, evt, "test-portfolio");
    setTimeout(() => {
      expect(positionSnaps).toBe(1);
      expect(portfolioSnaps).toBe(1);
      done();
    }, 150);
  });
  it('should not emit duplicate snapshots for duplicate ExecutionResult', done => {
    const bus = new EventBus();
    startPortfolioPipeline(bus);
    let fire = 0;
    bus.subscribe('position.snapshot', () => fire++);
    const mockResult = {
      id: 'exec-dupe',
      symbol: 'BTCUSDT',
      side: 'buy',
      status: 'simulated',
      executionRequestId: 'req-123',
      riskDecisionId: 'risk-abc',
      actionCandidateId: 'a-1',
      signalId: 's-1',
      reason: 'simulation',
      adapter: 'mock',
      timestamp: new Date().toISOString()
    };
    bus.publish('execution.result', { id: 'env1', payload: mockResult });
    bus.publish('execution.result', { id: 'env2', payload: mockResult });
    setTimeout(() => {
      expect(fire).toBe(1);
      done();
    }, 100);
  });
});
