import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import PositionPage from '../src/pages/PositionPage';

vi.mock('../src/api/apiClient', () => ({
  fetchPositions: () => Promise.resolve([
    { id: 'p1', symbol: 'BTCUSDT', qty: 12, entryPrice: 50000 }
  ])
}));

describe('PositionPage', () => {
  it('renders position table', async () => {
    render(<PositionPage />);
    await waitFor(() => screen.getByText(/BTCUSDT/));
    expect(screen.getByText(/BTCUSDT/)).toBeTruthy();
    expect(screen.getByText(/12/)).toBeTruthy();
  });
});
