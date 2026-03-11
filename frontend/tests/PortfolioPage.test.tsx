import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import PortfolioPage from '../src/pages/PortfolioPage';

jest.mock('../src/api/apiClient', () => ({ fetchPortfolio: () => Promise.resolve({ equity: 12345, openPositions: ['BTCUSDT'], lastExecutionResultId: 'id2', timestamp: 'now' }) }));

describe('PortfolioPage', () => {
  it('renders portfolio summary', async () => {
    render(<PortfolioPage />);
    await waitFor(() => screen.getByText(/Portfolio Snapshot/));
    expect(screen.getByText(/Portfolio Snapshot/)).toBeInTheDocument();
    expect(screen.getByText(/12345/)).toBeInTheDocument();
  });
});