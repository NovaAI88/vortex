const API_BASE = 'http://localhost:3000';

export async function fetchEnginePanelState() {
  const resp = await fetch(`${API_BASE}/api/engine/state`);
  if (!resp.ok) throw new Error('Failed to fetch engine state');
  return resp.json();
}

export async function pauseEngine() {
  const resp = await fetch(`${API_BASE}/api/engine/pause`, { method: 'POST' });
  if (!resp.ok) throw new Error('Failed to pause engine');
  return resp.json();
}

export async function resumeEngine() {
  const resp = await fetch(`${API_BASE}/api/engine/resume`, { method: 'POST' });
  if (!resp.ok) throw new Error('Failed to resume engine');
  return resp.json();
}
