import { fetchStatus, fetchPosition, fetchPortfolio } from '../src/api/apiClient';

global.fetch = jest.fn((url) => Promise.resolve({ ok: true, json: () => Promise.resolve({ test: url }) })) as any;

describe('apiClient', () => {
  it('fetchStatus calls /api/status', async () => {
    const data = await fetchStatus();
    expect(data.test).toMatch('/api/status');
  });
  it('fetchPosition calls /api/position', async () => {
    const data = await fetchPosition();
    expect(data.test).toMatch('/api/position');
  });
  it('fetchPortfolio calls /api/portfolio', async () => {
    const data = await fetchPortfolio();
    expect(data.test).toMatch('/api/portfolio');
  });
});