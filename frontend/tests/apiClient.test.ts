import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchStatus, fetchPositions, fetchPortfolio, fetchSystemStatus, fetchAiAnalysis, fetchAiResearch } from '../src/api/apiClient';

beforeEach(() => {
  global.fetch = vi.fn((url: string) => Promise.resolve({ ok: true, json: () => Promise.resolve({ test: url }) } as Response)) as any;
});

describe('apiClient', () => {
  it('fetchStatus calls /api/status', async () => {
    const data = await fetchStatus();
    expect(data.test).toMatch('/api/status');
  });

  it('fetchPositions calls /api/position', async () => {
    const data = await fetchPositions();
    expect(data.test).toMatch('/api/position');
  });

  it('fetchPortfolio calls /api/portfolio', async () => {
    const data = await fetchPortfolio();
    expect(data.test).toMatch('/api/portfolio');
  });

  it('fetchSystemStatus calls /api/system/status', async () => {
    const data = await fetchSystemStatus();
    expect(data.test).toMatch('/api/system/status');
  });

  it('fetchAiAnalysis calls /api/ai/analysis', async () => {
    const data = await fetchAiAnalysis();
    expect(data.test).toMatch('/api/ai/analysis');
  });

  it('fetchAiResearch calls /api/ai/research', async () => {
    const data = await fetchAiResearch();
    expect(data.test).toMatch('/api/ai/research');
  });
});
