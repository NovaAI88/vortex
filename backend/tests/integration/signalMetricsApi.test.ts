import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/api/index';
import {
  getSignalOutcomeStateFilePath,
  resetSignalOutcomeTrackerForTesting,
  updateSignalOutcomesForTick,
  trackSignal,
} from '../../src/performance/signalOutcomeTracker';

describe('signal metrics api', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    resetSignalOutcomeTrackerForTesting();
  });

  it('GET /api/performance/signal-metrics returns 200 with expected shape', async () => {
    const res = await request(app).get('/api/performance/signal-metrics');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        totals: expect.objectContaining({
          tracked: expect.any(Number),
          active: expect.any(Number),
          completed: expect.any(Number),
          success: expect.any(Number),
          failure: expect.any(Number),
          timeout: expect.any(Number),
        }),
        rates: expect.objectContaining({
          successRate: expect.any(Number),
          failureRate: expect.any(Number),
          timeoutRate: expect.any(Number),
        }),
        excursions: expect.objectContaining({
          avgMfePct: expect.any(Number),
          avgMaePct: expect.any(Number),
        }),
        byTriggerMode: expect.objectContaining({
          rsi_extreme: expect.any(Object),
          context_confirmed: expect.any(Object),
          unknown: expect.any(Object),
        }),
      }),
    );
  });

  it('GET /api/performance/signal-tracks returns 200 with persisted state metadata', async () => {
    const res = await request(app).get('/api/performance/signal-tracks');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      active: [],
      completed: [],
      persistence: {
        stateFile: getSignalOutcomeStateFilePath(),
      },
    });
  });

  it('returns one active track after trackSignal()', async () => {
    trackSignal({
      signalId: 'sig-api-1',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 1,
      triggerMode: 'rsi_extreme',
      confidence: 0.8,
      rsi14AtSignal: 30,
      rangeLocationAtSignal: 0.1,
    });

    const res = await request(app).get('/api/performance/signal-tracks');

    expect(res.status).toBe(200);
    expect(res.body.active).toHaveLength(1);
    expect(res.body.completed).toEqual([]);
    expect(res.body.persistence).toEqual({
      stateFile: getSignalOutcomeStateFilePath(),
    });
  });

  it('GET /api/performance/signal-verification returns filtered completed verification data', async () => {
    trackSignal({
      signalId: 'sig-rsi-active',
      symbol: 'BTCUSDT',
      side: 'buy',
      entryPrice: 100,
      entryTick: 1,
      triggerMode: 'rsi_extreme',
      confidence: 0.83,
      rsi14AtSignal: 28,
      rangeLocationAtSignal: 0.06,
    });

    trackSignal({
      signalId: 'sig-context-complete',
      symbol: 'ETHUSDT',
      side: 'sell',
      entryPrice: 200,
      entryTick: 1,
      triggerMode: 'context_confirmed',
      confidence: 0.79,
      rsi14AtSignal: 70,
      rangeLocationAtSignal: 0.93,
    });

    updateSignalOutcomesForTick({ symbol: 'ETHUSDT', price: 199, tickIndex: 2 });

    const res = await request(app)
      .get('/api/performance/signal-verification')
      .query({ triggerMode: 'context_confirmed', status: 'completed', limit: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      filters: {
        triggerMode: 'context_confirmed',
        status: 'completed',
        limit: 5,
      },
      summary: {
        active: 0,
        completed: 1,
        persisted: 1,
        byOutcome: {
          success: 1,
          failure: 0,
          timeout: 0,
        },
        byTriggerMode: {
          rsi_extreme: 0,
          context_confirmed: 1,
          unknown: 0,
        },
      },
      active: [],
      completed: [
        expect.objectContaining({
          signalId: 'sig-context-complete',
          triggerMode: 'context_confirmed',
          outcome: 'success',
        }),
      ],
      persistence: {
        stateFile: getSignalOutcomeStateFilePath(),
        exists: true,
      },
    });
  });
});
