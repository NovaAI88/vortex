// Simple fetch API client for dashboard components

export async function fetchStatus() {
  const resp = await fetch('/api/status');
  if (!resp.ok) throw new Error('Failed to fetch status');
  return resp.json();
}

export async function fetchPortfolio() {
  const resp = await fetch('/api/portfolio');
  if (!resp.ok) throw new Error('Failed to fetch portfolio');
  return resp.json();
}

export async function fetchPositions() {
  const resp = await fetch('/api/positions');
  if (!resp.ok) throw new Error('Failed to fetch positions');
  return resp.json();
}
