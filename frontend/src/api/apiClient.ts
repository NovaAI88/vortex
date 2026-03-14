// Minimal correct API BASE for local Docker setup
const API_BASE = 'http://localhost:3000';

export async function fetchStatus() {
  // Retain for compatibility; GET /api/status

  const resp = await fetch(`${API_BASE}/api/status`);
  if (!resp.ok) throw new Error('Failed to fetch status');
  return resp.json();
}

export async function fetchPortfolio() {
  // Try /api/portfolio/paper first for real paper trading
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

export async function fetchApiStatus() {
  const resp = await fetch(`${API_BASE}/api/status`);
  if (!resp.ok) throw new Error('Failed to fetch API status');
  return resp.json();
}

export async function fetchOrderbook() {
  const resp = await fetch(`${API_BASE}/api/orderbook`);
  if (!resp.ok) throw new Error('Failed to fetch orderbook');
  return resp.json();
}

export async function fetchTrades() {
  const resp = await fetch(`${API_BASE}/api/trades`);
  if (!resp.ok) throw new Error('Failed to fetch trades');
  return resp.json();
}

export async function fetchAlerts() {
  const resp = await fetch(`${API_BASE}/api/alerts`);
  if (!resp.ok) throw new Error('Failed to fetch alerts');
  return resp.json();
}


export async function fetchLegacyStatus() {
  const resp = await fetch(`${API_BASE}/status`);
  // Only use if /status endpoint needed for health badge
  if (!resp.ok) throw new Error('Failed to fetch legacy status');
  return resp.json();
}
