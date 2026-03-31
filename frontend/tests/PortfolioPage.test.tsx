import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PortfolioPage from '../src/pages/PortfolioPage';

vi.mock('../src/api/apiClient', () => ({
  fetchStatus: () => Promise.resolve({ status: 'ok', uptime: 99, timestamp: 'now', build: 'dev' }),
  fetchOperatorState: () => Promise.resolve({ tradingEnabled: true }),
  fetchRisks: () => Promise.resolve([]),
  fetchRuntimeState: () => Promise.resolve({ runtimeState: 'LIVE', updatedAt: new Date().toISOString() }),
  startTrading: () => Promise.resolve({ ok: true }),
  pauseTrading: () => Promise.resolve({ ok: true }),
  manualClosePosition: () => Promise.resolve({ ok: true }),
  manualFlattenAll: () => Promise.resolve({ ok: true }),
  manualFlattenVariant: () => Promise.resolve({ ok: true }),
  manualTakeProfit: () => Promise.resolve({ ok: true }),
  fetchPortfolio: () => Promise.resolve({
    balance: 10000,
    equity: 12345,
    pnl: 12,
    positions: [],
    trades: []
  })
}));

describe('PortfolioPage', () => {
  it('renders portfolio command center title', async () => {
    render(<PortfolioPage />);
    await waitFor(() => screen.getByText(/Portfolio Command Center/i));
    expect(screen.getByText(/Portfolio Command Center/i)).toBeTruthy();
  });
});
