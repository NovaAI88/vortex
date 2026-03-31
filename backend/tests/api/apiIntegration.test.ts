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
});
