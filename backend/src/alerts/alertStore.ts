// VORTEX — Alert Store (persistent)
//
// In-memory store for runtime alerts with disk persistence.
// Alerts are appended to data/alerts.jsonl on write and loaded on startup.
// This ensures alerts survive backend restarts — critical for post-mortem visibility.
//
// Cap: 500 entries in memory, 500 in the JSONL file (pruned on load).

import fs from 'node:fs';
import path from 'node:path';

export interface Alert {
  timestamp: string;
  severity: 'info' | 'warning' | 'error';
  source: string;
  message: string;
}

const MAX_ALERTS = 500;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.jsonl');

let alerts: Alert[] = [];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function loadAlertsFromDisk(): Alert[] {
  ensureDataDir();
  if (!fs.existsSync(ALERTS_FILE)) return [];
  try {
    const lines = fs.readFileSync(ALERTS_FILE, 'utf8')
      .split('\n')
      .filter(l => l.trim().length > 0);
    const parsed: Alert[] = lines
      .map(l => { try { return JSON.parse(l); } catch { return null; } })
      .filter(Boolean) as Alert[];
    // Return most recent MAX_ALERTS entries — newest-first after sort
    return parsed
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, MAX_ALERTS);
  } catch {
    return [];
  }
}

function appendAlertToDisk(alert: Alert): void {
  try {
    ensureDataDir();
    fs.appendFileSync(ALERTS_FILE, JSON.stringify(alert) + '\n', 'utf8');
  } catch {
    // Disk write failure must not crash alert emission
  }
}

function pruneAlertFile(): void {
  // Rewrite the file with only the MAX_ALERTS most recent entries.
  // Called periodically to prevent unbounded growth.
  try {
    ensureDataDir();
    const current = loadAlertsFromDisk();
    // current is already sorted newest-first; reverse for JSONL (oldest first = natural append order)
    const lines = current.slice(0, MAX_ALERTS).reverse().map(a => JSON.stringify(a)).join('\n');
    fs.writeFileSync(ALERTS_FILE, lines + '\n', 'utf8');
  } catch {}
}

// Load persisted alerts on module init
alerts = loadAlertsFromDisk();

let writesSinceLastPrune = 0;
const PRUNE_EVERY = 100; // prune file every 100 writes

export function appendAlert(alert: Alert): void {
  // In-memory store — newest first
  alerts.unshift(alert);
  if (alerts.length > MAX_ALERTS) alerts = alerts.slice(0, MAX_ALERTS);

  // Persist to disk
  appendAlertToDisk(alert);

  // Periodic prune to keep file bounded
  writesSinceLastPrune++;
  if (writesSinceLastPrune >= PRUNE_EVERY) {
    writesSinceLastPrune = 0;
    pruneAlertFile();
  }
}

export function getRecentAlerts(limit = MAX_ALERTS): Alert[] {
  return alerts.slice(0, Math.min(limit, MAX_ALERTS));
}

export function getAlertCount(): number {
  return alerts.length;
}
