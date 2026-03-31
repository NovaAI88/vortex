import { API_BASE } from './config';

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

export async function resetPortfolio() {
  const resp = await fetch(`${API_BASE}/api/engine/reset-portfolio`, { method: 'POST' });
  if (!resp.ok) throw new Error('Failed to reset portfolio');
  return resp.json();
}
