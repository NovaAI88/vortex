// Test Decision Layer: TradeSignal -> Decision -> ActionCandidate flow
import { EventBus } from '../../../src/events/eventBus';
import { EVENT_TOPICS } from '../../../src/events/topics';
import { getMockRawPayload } from '../../../src/ingestion/connectors/mockConnector';
import { adaptMockPayloadToMarketEvent } from '../../../src/ingestion/adapters/mockAdapter';
import { publishMarketEvent } from '../../../src/ingestion/publishers/marketEventPublisher';
import { startProcessingPipeline } from '../../../src/processing/processingPipeline';
import { startIntelligencePipeline } from '../../../src/intelligence/intelligencePipeline';
import { startDecisionPipeline } from '../../../src/decision/decisionPipeline';

describe('Decision Pipeline', () => {
  it('should produce ActionCandidate from strong advisory TradeSignal', done => {
    const bus = new EventBus();
    startProcessingPipeline(bus);
    startIntelligencePipeline(bus);
    startDecisionPipeline(bus);
    bus.subscribe(EVENT_TOPICS.DECISION_CANDIDATE, envelope => {
      expect(envelope.payload.symbol).toBe('BTCUSDT');
      expect(envelope.payload.side).toMatch(/buy|sell/);
      expect(envelope.payload.confidence).toBeGreaterThanOrEqual(0.7);
      done();
    });
    // Mock a MarketEvent where price < movingAvg -> basicSignalGenerator => 'buy', confidence 0.7
    const raw = getMockRawPayload();
    raw.price = 9000; // below movingAvg to trigger BUY
    raw.movingAvg = 9500;
    const evt = adaptMockPayloadToMarketEvent(raw);
    publishMarketEvent(bus, evt, 'test-decision');
  });
});
