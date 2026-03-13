// Minimal event bus scaffold test
import { EventBus } from '../../src/events/eventBus';
import { EventEnvelope } from '../../src/events/eventEnvelope';
import { EVENT_TOPICS } from '../../src/events/topics';

import { describe, it, expect } from 'vitest';

describe('EventBus', () => {
  it('should deliver events to subscriber', done => {
    const bus = new EventBus();
    const payload = { foo: 'bar' };
    const envelope: EventEnvelope<typeof payload> = {
      id: '1',
      topic: EVENT_TOPICS.MARKET_EVENT,
      timestamp: new Date().toISOString(),
      producer: 'test',
      version: '1.0',
      payload,
    };
    bus.subscribe<typeof payload>(EVENT_TOPICS.MARKET_EVENT, evt => {
      expect(evt.payload.foo).toBe('bar');
      done();
    });
    bus.publish(EVENT_TOPICS.MARKET_EVENT, envelope);
  });
});
