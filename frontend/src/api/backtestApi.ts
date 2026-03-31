import { API_BASE } from './config';

export async function runBacktest(variants = ['v1','v2','v3']) {
  const resp = await fetch(`${API_BASE}/api/backtest/run`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ variants }),
  });
  if (!resp.ok) throw new Error('Failed to run backtest');
  return resp.json();
}

export async function fetchBacktestResults() {
  const resp = await fetch(`${API_BASE}/api/backtest/results`);
  if (!resp.ok) throw new Error('Failed to fetch backtest results');
  return resp.json();
}

export async function fetchBacktestStatus() {
  const resp = await fetch(`${API_BASE}/api/backtest/status`);
  if (!resp.ok) throw new Error('Failed to fetch backtest status');
  return resp.json();
}

export async function waitForBacktestDone(timeoutMs = 120000, intervalMs = 750) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const status = await fetchBacktestStatus();
    if (status?.status === 'done') return status;
    if (status?.status === 'error') throw new Error(status?.error || 'Backtest failed');
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error('Timed out waiting for backtest completion');
}
