// Test Processing Layer: MarketEvent -> ProcessedMarketState, through all steps
import { EventBus } from '../../../src/events/eventBus';
import { EVENT_TOPICS } from '../../../src/events/topics';
import { getMockRawPayload } from '../../../src/ingestion/connectors/mockConnector';
import { adaptMockPayloadToMarketEvent } from '../../../src/ingestion/adapters/mockAdapter';
import { publishMarketEvent } from '../../../src/ingestion/publishers/marketEventPublisher';
import { startProcessingPipeline } from '../../../src/processing/processingPipeline';

describe('Processing Pipeline', () => {
  it('should process MarketEvent into ProcessedMarketState on bus', done => {
    const bus = new EventBus();
    startProcessingPipeline(bus);
    bus.subscribe(EVENT_TOPICS.PROCESSING_STATE, envelope => {
      expect(envelope.payload.enriched).toBe(true);
      expect(envelope.payload.baseEvent.symbol).toBe('BTCUSDT');
      done();
    });
    const raw = getMockRawPayload();
    const evt = adaptMockPayloadToMarketEvent(raw);
    publishMarketEvent(bus, evt, "test-processing");
  });
});
