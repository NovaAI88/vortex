import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/api/index';

describe('profitability loop api', () => {
  beforeEach(() => {
    process.env.NODE_ENV = 'test';
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vortex-profitability-api-'));
    process.env.PROFITABILITY_LOOP_STATE_FILE = path.join(tempDir, 'profitability-loop.json');
  });

  it('GET /api/performance/profitability-loop returns snapshot and persistence metadata', async () => {
    const res = await request(app).get('/api/performance/profitability-loop');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        snapshot: expect.objectContaining({
          generatedAt: expect.any(String),
          profitability: expect.objectContaining({
            equity: expect.any(Number),
            realizedPnl: expect.any(Number),
            returnPct: expect.any(Number),
            resolvedTradeCount: expect.any(Number),
          }),
          signalQuality: expect.objectContaining({
            tracked: expect.any(Number),
            completed: expect.any(Number),
            successRate: expect.any(Number),
          }),
          safety: expect.objectContaining({
            tradingAllowed: expect.any(Boolean),
            killSwitch: expect.any(Boolean),
          }),
          verification: expect.objectContaining({
            flag: expect.any(String),
            summary: expect.any(String),
          }),
          research: expect.objectContaining({
            available: expect.any(Boolean),
          }),
          tuningFocus: expect.any(Array),
          warnings: expect.any(Array),
        }),
        persistence: expect.objectContaining({
          stateFile: expect.any(String),
          historyCount: expect.any(Number),
        }),
      }),
    );
  });

  it('history endpoint returns newest-first snapshots with limit', async () => {
    await request(app).get('/api/performance/profitability-loop');
    await request(app).get('/api/performance/profitability-loop');

    const historyRes = await request(app).get('/api/performance/profitability-loop/history?limit=1');
    expect(historyRes.status).toBe(200);
    expect(historyRes.body.snapshots).toHaveLength(1);
    expect(historyRes.body.count).toBeGreaterThanOrEqual(2);
    expect(historyRes.body.limit).toBe(1);
  });
});
