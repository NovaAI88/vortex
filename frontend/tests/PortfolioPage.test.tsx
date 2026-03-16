import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PortfolioPage from '../src/pages/PortfolioPage';

vi.mock('../src/api/apiClient', () => ({
  fetchPortfolio: () => Promise.resolve({
    balance: 10000,
    equity: 12345,
    pnl: 12,
    positions: [],
    trades: []
  })
}));

describe('PortfolioPage', () => {
  it('renders portfolio page title', async () => {
    render(<PortfolioPage />);
    await waitFor(() => screen.getByRole('heading', { name: /^Portfolio$/i }));
    expect(screen.getByRole('heading', { name: /^Portfolio$/i })).toBeTruthy();
  });
});
