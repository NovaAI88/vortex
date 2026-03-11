import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import StatusPage from '../src/pages/StatusPage';

jest.mock('../src/api/apiClient', () => ({ fetchStatus: () => Promise.resolve({ status: 'ok', uptime: 99, timestamp: 'now', build: 'dev' }) }));

describe('StatusPage', () => {
  it('renders system status', async () => {
    render(<StatusPage />);
    await waitFor(() => screen.getByText(/System Status/i));
    expect(screen.getByText(/System Status/i)).toBeInTheDocument();
    expect(screen.getByText(/Uptime/)).toBeInTheDocument();
  });
});