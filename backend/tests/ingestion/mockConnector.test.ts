// Test the mock ingestion pipeline: connector → adapter → publisher → event bus
import { getMockRawPayload } from '../../src/ingestion/connectors/mockConnector'
import { describe, it, expect } from 'vitest';
import { adaptMockPayloadToMarketEvent } from '../../src/ingestion/adapters/mockAdapter';
import { publishMarketEvent } from '../../src/ingestion/publishers/marketEventPublisher';
import { EventBus } from '../../src/events/eventBus';
import { EVENT_TOPICS } from '../../src/events/topics';

describe('Mock Ingestion Pipeline', () => {
  it('should emit valid MarketEvent and deliver via event bus', done => {
    const bus = new EventBus();
    bus.subscribe(EVENT_TOPICS.MARKET_EVENT, envelope => {
      expect(envelope.payload.symbol).toBe('BTCUSDT');
      done();
    });
    const raw = getMockRawPayload();
    const evt = adaptMockPayloadToMarketEvent(raw);
    publishMarketEvent(bus, evt, "test-mock");
  });
});
