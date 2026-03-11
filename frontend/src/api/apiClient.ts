export async function fetchStatus() {
  const res = await fetch('/api/status');
  if (!res.ok) throw new Error('Status fetch failed');
  return res.json();
}
export async function fetchPosition() {
  const res = await fetch('/api/position');
  if (!res.ok) throw new Error('Position fetch failed');
  return res.json();
}
export async function fetchPortfolio() {
  const res = await fetch('/api/portfolio');
  if (!res.ok) throw new Error('Portfolio fetch failed');
  return res.json();
}
