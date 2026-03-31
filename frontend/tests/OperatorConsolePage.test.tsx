import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import OperatorConsolePage from '../src/pages/OperatorConsolePage';

const mocks = vi.hoisted(() => ({
  fetchSystemStatus: vi.fn(),
  startTrading: vi.fn(),
  pauseTrading: vi.fn(),
  resetRisk: vi.fn(),
  overrideRisk: vi.fn(),
  clearRiskOverride: vi.fn(),
}));

vi.mock('../src/api/apiClient', () => ({
  fetchSystemStatus: mocks.fetchSystemStatus,
  startTrading: mocks.startTrading,
  pauseTrading: mocks.pauseTrading,
  resetRisk: mocks.resetRisk,
  overrideRisk: mocks.overrideRisk,
  clearRiskOverride: mocks.clearRiskOverride,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('OperatorConsolePage', () => {
  it('renders operator console data from system status snapshot', async () => {
    mocks.fetchSystemStatus.mockResolvedValue({
      timestamp: new Date().toISOString(),
      systemHealth: 'HEALTHY',
      tradingAllowed: true,
      engine: { mode: 'PAPER_TRADING' },
      risk: { killSwitch: false, drawdownPercent: 1.2, tradingAllowed: true },
      operator: { tradingEnabled: true, riskOverrideActive: false, lastAction: 'start' },
      circuitBreaker: { consecutiveLosses: 1, maxConsecutiveLosses: 5, approachingThreshold: false },
      aiAnalysis: { regime: 'TREND', confidence: 0.82 },
      aiResearch: { status: 'ready', recommendedAction: 'hold', riskFlags: [] },
      portfolio: { equity: 10250, openPositionCount: 2 },
      positionMonitor: { running: true, monitoredSymbol: 'BTCUSDT' },
      recentAlerts: [],
    });

    render(<OperatorConsolePage />);

    await waitFor(() => {
      expect(screen.getByText(/Operator Console/i)).toBeTruthy();
      expect(screen.getByText(/System Health/i)).toBeTruthy();
      expect(screen.getByText(/PAPER_TRADING/i)).toBeTruthy();
      expect(screen.getByText(/Circuit breaker:/i)).toBeTruthy();
    });
  });

  it('shows backend error and handles control action failures', async () => {
    mocks.fetchSystemStatus.mockRejectedValue(new Error('offline'));
    mocks.pauseTrading.mockRejectedValue(new Error('action failed'));

    render(<OperatorConsolePage />);

    await waitFor(() => {
      expect(screen.getByText(/Backend not connected\./i)).toBeTruthy();
    });

    const pauseButton = screen.getAllByRole('button', { name: /^Pause$/i })[0];
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(screen.getByText(/action failed/i)).toBeTruthy();
    });
  });
});
