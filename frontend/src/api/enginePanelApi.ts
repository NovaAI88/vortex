const API_BASE = 'http://localhost:3000';

export async function fetchEnginePanelState() {
  const resp = await fetch(`${API_BASE}/api/engine/state`);
  if (!resp.ok) throw new Error('Failed to fetch engine state');
  return resp.json();
}
