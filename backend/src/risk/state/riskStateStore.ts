// VORTEX — Risk State Persistence
//
// Persists kill switch, daily baseline, and peak equity to disk so that
// a system restart does not silently reset critical safety state.
//
// A kill switch that resets on restart is not a kill switch.

import fs from 'node:fs';
import path from 'node:path';

export type PersistedRiskState = {
  killSwitch: boolean;
  killSwitchReason: string | null;
  killSwitchTimestamp: string | null;
  dailyDate: string;           // YYYY-MM-DD of current trading day
  dailyStartEquity: number;    // equity at start of current trading day
  peakEquity: number;          // all-time peak equity for drawdown calculation
  lastUpdated: string;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const RISK_STATE_FILE = path.join(DATA_DIR, 'risk-state.json');

function defaultRiskState(): PersistedRiskState {
  const today = new Date().toISOString().slice(0, 10);
  return {
    killSwitch: false,
    killSwitchReason: null,
    killSwitchTimestamp: null,
    dailyDate: today,
    dailyStartEquity: 10000,
    peakEquity: 10000,
    lastUpdated: new Date().toISOString(),
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadRiskState(): PersistedRiskState {
  ensureDataDir();

  if (!fs.existsSync(RISK_STATE_FILE)) {
    const initial = defaultRiskState();
    fs.writeFileSync(RISK_STATE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(RISK_STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    const today = new Date().toISOString().slice(0, 10);
    return {
      killSwitch: typeof parsed.killSwitch === 'boolean' ? parsed.killSwitch : false,
      killSwitchReason: typeof parsed.killSwitchReason === 'string' ? parsed.killSwitchReason : null,
      killSwitchTimestamp: typeof parsed.killSwitchTimestamp === 'string' ? parsed.killSwitchTimestamp : null,
      // If stored daily date differs from today, reset daily baseline
      dailyDate: today,
      dailyStartEquity: parsed.dailyDate === today && typeof parsed.dailyStartEquity === 'number' && parsed.dailyStartEquity > 0
        ? parsed.dailyStartEquity
        : 10000,
      peakEquity: typeof parsed.peakEquity === 'number' && parsed.peakEquity > 0 ? parsed.peakEquity : 10000,
      lastUpdated: parsed.lastUpdated || new Date().toISOString(),
    };
  } catch {
    const fallback = defaultRiskState();
    fs.writeFileSync(RISK_STATE_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

export function saveRiskState(state: PersistedRiskState): void {
  ensureDataDir();
  const safe: PersistedRiskState = {
    killSwitch: !!state.killSwitch,
    killSwitchReason: typeof state.killSwitchReason === 'string' ? state.killSwitchReason : null,
    killSwitchTimestamp: typeof state.killSwitchTimestamp === 'string' ? state.killSwitchTimestamp : null,
    dailyDate: typeof state.dailyDate === 'string' ? state.dailyDate : new Date().toISOString().slice(0, 10),
    dailyStartEquity: Number.isFinite(state.dailyStartEquity) && state.dailyStartEquity > 0 ? state.dailyStartEquity : 10000,
    peakEquity: Number.isFinite(state.peakEquity) && state.peakEquity > 0 ? state.peakEquity : 10000,
    lastUpdated: new Date().toISOString(),
  };
  fs.writeFileSync(RISK_STATE_FILE, JSON.stringify(safe, null, 2), 'utf8');
}
