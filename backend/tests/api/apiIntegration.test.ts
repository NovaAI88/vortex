// API integration tests (Express endpoints)
import app from '../../src/api/index';
import request from 'supertest';
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
  it('should 404 for /api/portfolio if empty', async () => {
    const res = await request(app).get('/api/portfolio');
    expect(res.status).toBe(404);
  });
});
