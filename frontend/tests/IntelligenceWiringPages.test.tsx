import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import NewsIntelligencePage from '../src/pages/NewsIntelligencePage';
import NarrativeEdgePage from '../src/pages/NarrativeEdgePage';

const mocks = vi.hoisted(() => ({
  fetchStatus: vi.fn(),
  fetchSignals: vi.fn(),
  fetchDecisions: vi.fn(),
  fetchAiResearch: vi.fn(),
  fetchAiAnalysis: vi.fn(),
}));

vi.mock('../src/api/apiClient', () => ({
  fetchStatus: mocks.fetchStatus,
  fetchSignals: mocks.fetchSignals,
  fetchDecisions: mocks.fetchDecisions,
  fetchAiResearch: mocks.fetchAiResearch,
  fetchAiAnalysis: mocks.fetchAiAnalysis,
}));

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('Intelligence page wiring', () => {
  it('renders News page from /api/ai/research payload', async () => {
    mocks.fetchStatus.mockResolvedValue({ status: 'ok', timestamp: 'now' });
    mocks.fetchSignals.mockResolvedValue([{ id: 's1' }]);
    mocks.fetchAiResearch.mockResolvedValue({
      available: true,
      report: {
        status: 'ok',
        summary: 'TREND | LONG | conf 74.0%',
        marketInterpretation: 'Trend regime detected.',
        recommendedAction: 'long_bias_only',
        riskFlags: ['news_risk_flag'],
      },
    });

    render(<NewsIntelligencePage />);

    await waitFor(() => {
      expect(screen.getByText(/News Intelligence Terminal/i)).toBeTruthy();
      expect(screen.getByText(/TREND \| LONG/i)).toBeTruthy();
      expect(screen.getByText(/long_bias_only/i)).toBeTruthy();
      expect(screen.getByText(/news_risk_flag/i)).toBeTruthy();
    });
  });

  it('renders Narrative page from /api/ai/analysis payload', async () => {
    mocks.fetchStatus.mockResolvedValue({ status: 'ok', timestamp: 'now' });
    mocks.fetchSignals.mockResolvedValue([{ id: 's1' }]);
    mocks.fetchDecisions.mockResolvedValue([{ id: 'd1' }]);
    mocks.fetchAiAnalysis.mockResolvedValue({
      available: true,
      regime: 'TREND',
      bias: 'LONG',
      confidence: 0.82,
      volatilityLevel: 0.23,
      leverageBand: 'HIGH',
      rationale: ['Uptrend confirmed', 'Confidence stable'],
    });

    render(<NarrativeEdgePage />);

    await waitFor(() => {
      expect(screen.getByText(/Narrative Edge Terminal/i)).toBeTruthy();
      expect(screen.getByText(/82.0%/i)).toBeTruthy();
      expect(screen.getByText(/Analysis Snapshot/i)).toBeTruthy();
      expect(screen.getByText(/Uptrend confirmed/i)).toBeTruthy();
    });
  });
});
