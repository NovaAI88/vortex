// Minimal correct API BASE for local Docker setup
const API_BASE = 'http://localhost:3001';

export async function fetchStatus() {
  const resp = await fetch(`${API_BASE}/api/status`);
  if (!resp.ok) throw new Error('Failed to fetch status');
  return resp.json();
}

export async function fetchPortfolio() {
  const resp = await fetch(`${API_BASE}/api/portfolio/paper`);
  if (!resp.ok) throw new Error('Failed to fetch portfolio');
  return resp.json();
}

export async function fetchPositions() {
  const resp = await fetch(`${API_BASE}/api/position`);
  if (!resp.ok) throw new Error('Failed to fetch positions');
  return resp.json();
}

export async function fetchSignals() {
  const resp = await fetch(`${API_BASE}/api/signals`);
  if (!resp.ok) throw new Error('Failed to fetch signals');
  return resp.json();
}

export async function fetchDecisions() {
  const resp = await fetch(`${API_BASE}/api/decisions`);
  if (!resp.ok) throw new Error('Failed to fetch decisions');
  return resp.json();
}

export async function fetchRisks() {
  const resp = await fetch(`${API_BASE}/api/risk`);
  if (!resp.ok) throw new Error('Failed to fetch risk');
  return resp.json();
}

export async function fetchStrategyPerformance() {
  const resp = await fetch(`${API_BASE}/api/strategies/performance`);
  if (!resp.ok) throw new Error('Failed to fetch strategy performance');
  return resp.json();
}

export async function fetchStrategyWeights() {
  const resp = await fetch(`${API_BASE}/api/strategies/weights`);
  if (!resp.ok) throw new Error('Failed to fetch strategy weights');
  return resp.json();
}

export async function fetchEngineStatus() {
  const resp = await fetch(`${API_BASE}/api/engine/status`);
  if (!resp.ok) throw new Error('Failed to fetch engine status');
  return resp.json();
}

export async function fetchEngineRisk() {
  const resp = await fetch(`${API_BASE}/api/engine/risk`);
  if (!resp.ok) throw new Error('Failed to fetch engine risk');
  return resp.json();
}
