// Test Intelligence Layer: Processing → Intelligence → TradeSignal
import { EventBus } from '../../../src/events/eventBus';
import { EVENT_TOPICS } from '../../../src/events/topics';
import { getMockRawPayload } from '../../../src/ingestion/connectors/mockConnector';
import { adaptMockPayloadToMarketEvent } from '../../../src/ingestion/adapters/mockAdapter';
import { publishMarketEvent } from '../../../src/ingestion/publishers/marketEventPublisher';
import { startProcessingPipeline } from '../../../src/processing/processingPipeline';
import { startIntelligencePipeline } from '../../../src/intelligence/intelligencePipeline';

describe('Intelligence Signal Pipeline', () => {
  it('should create advisory TradeSignal from ProcessedMarketState', done => {
    const bus = new EventBus();
    startProcessingPipeline(bus);
    startIntelligencePipeline(bus);
    bus.subscribe(EVENT_TOPICS.INTELLIGENCE_SIGNAL, envelope => {
      expect(envelope.payload.signalType).toBeDefined();
      expect(envelope.payload.symbol).toBe('BTCUSDT');
      expect(envelope.payload.confidence).toBeGreaterThan(0);
      done();
    });
    const raw = getMockRawPayload();
    const evt = adaptMockPayloadToMarketEvent(raw);
    publishMarketEvent(bus, evt, "test-intel");
  });
});
