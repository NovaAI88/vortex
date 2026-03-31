import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StatusPage from '../src/pages/StatusPage';

vi.mock('../src/api/apiClient', () => ({
  fetchStatus: () => Promise.resolve({ status: 'ok', uptime: 99, timestamp: 'now', build: 'dev' }),
  fetchEngineStatus: () => Promise.resolve({ status: 'ok', service: 'VORTEX backend', uptime: 99, timestamp: 'now' }),
  fetchEngineRisk: () => Promise.resolve({ tradingAllowed: true, killSwitch: false, activeBlockReason: null }),
  fetchAlerts: () => Promise.resolve([]),
  fetchOperatorState: () => Promise.resolve({ tradingEnabled: true }),
  startTrading: () => Promise.resolve({ ok: true }),
  pauseTrading: () => Promise.resolve({ ok: true }),
  fetchRuntimeState: () => Promise.resolve({ runtimeState: 'LIVE', updatedAt: new Date().toISOString() }),
  fetchPipelineTrace: () => Promise.resolve([]),
  resetRisk: () => Promise.resolve({ ok: true }),
  overrideRisk: () => Promise.resolve({ ok: true }),
  clearRiskOverride: () => Promise.resolve({ ok: true }),
}));

describe('StatusPage', () => {
  it('renders system status terminal header', async () => {
    render(<StatusPage />);
    await waitFor(() => screen.getByText(/System Status Terminal/i));
    expect(screen.getByText(/System Status Terminal/i)).toBeTruthy();
  });
});
