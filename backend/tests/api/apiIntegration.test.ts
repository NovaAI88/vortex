// API integration tests (Express endpoints)
import app from '../../src/api/index';
import request from 'supertest';
import { describe, it, expect } from 'vitest';
import { resetResearchPipelineStateForTesting } from '../../src/intelligence/aiResearchPipeline';
describe('API Endpoints', () => {
  it('should respond to GET /api/ping', async () => {
    const res = await request(app).get('/api/ping');
    expect(res.status).toBe(200);
    expect(res.text).toContain('pong');
  });
  it('should respond to GET /api/status', async () => {
    const res = await request(app).get('/api/status');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
  });
  it('should 404 for /api/position if empty', async () => {
    const res = await request(app).get('/api/position');
    expect(res.status).toBe(404);
  });
  it('should return ledger-backed /api/portfolio snapshot', async () => {
    const res = await request(app).get('/api/portfolio');
    expect(res.status).toBe(200);
    expect(typeof res.body.equity).toBe('number');
    expect(Array.isArray(res.body.positions)).toBe(true);
  });
  it('should respond to GET /api/ai/research', async () => {
    process.env.NODE_ENV = 'test';
    resetResearchPipelineStateForTesting();
    const res = await request(app).get('/api/ai/research');
    expect(res.status).toBe(200);
    expect(typeof res.body.available).toBe('boolean');
  });

  it('should return aggregated operator console payload via GET /api/system/status', async () => {
    const res = await request(app).get('/api/system/status');
    expect(res.status).toBe(200);
    expect(typeof res.body.systemHealth).toBe('string');
    expect(typeof res.body.tradingAllowed).toBe('boolean');
    expect(typeof res.body.engine?.mode).toBe('string');
    expect(typeof res.body.operator?.tradingEnabled).toBe('boolean');
    expect(typeof res.body.risk?.tradingAllowed).toBe('boolean');
  });

  it('should apply operator start/pause controls through operator endpoints', async () => {
    const paused = await request(app).post('/api/operator/pause');
    expect(paused.status).toBe(200);
    expect(paused.body.tradingEnabled).toBe(false);

    const started = await request(app).post('/api/operator/start');
    expect(started.status).toBe(200);
    expect(started.body.tradingEnabled).toBe(true);
  });
});
