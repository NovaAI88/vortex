import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PositionPage from '../src/pages/PositionPage';

jest.mock('../src/api/apiClient', () => ({ fetchPosition: () => Promise.resolve({ symbol: 'BTCUSDT', qty: 12, side: 'buy', sourceExecutionResultId: 'id1', timestamp: 'now' }) }));

describe('PositionPage', () => {
  it('renders position table', async () => {
    render(<PositionPage />);
    await waitFor(() => screen.getByText(/BTCUSDT/));
    expect(screen.getByText(/BTCUSDT/)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });
});
