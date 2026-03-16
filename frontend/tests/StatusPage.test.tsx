import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import StatusPage from '../src/pages/StatusPage';

vi.mock('../src/api/apiClient', () => ({
  fetchStatus: () => Promise.resolve({ status: 'ok', uptime: 99, timestamp: 'now', build: 'dev' }),
  fetchEngineStatus: () => Promise.resolve({ status: 'ok', service: 'AETHER backend', uptime: 99, timestamp: 'now' })
}));

describe('StatusPage', () => {
  it('renders backend monitoring header', async () => {
    render(<StatusPage />);
    await waitFor(() => screen.getByText(/Backend Service Monitoring/i));
    expect(screen.getByText(/Backend Service Monitoring/i)).toBeTruthy();
  });
});
