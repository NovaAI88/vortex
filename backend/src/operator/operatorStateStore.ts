import fs from 'node:fs';
import path from 'node:path';

export type OperatorState = {
  tradingEnabled: boolean;
  lastUpdated: string;
};

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'operator-state.json');

function defaultState(): OperatorState {
  return {
    tradingEnabled: true,
    lastUpdated: new Date().toISOString(),
  };
}

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function loadOperatorState(): OperatorState {
  ensureDataDir();

  if (!fs.existsSync(STATE_FILE)) {
    const initial = defaultState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(initial, null, 2), 'utf8');
    return initial;
  }

  try {
    const raw = fs.readFileSync(STATE_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    if (typeof parsed?.tradingEnabled !== 'boolean') throw new Error('Invalid operator state');
    return {
      tradingEnabled: parsed.tradingEnabled,
      lastUpdated: typeof parsed?.lastUpdated === 'string' ? parsed.lastUpdated : new Date().toISOString(),
    };
  } catch {
    const fallback = defaultState();
    fs.writeFileSync(STATE_FILE, JSON.stringify(fallback, null, 2), 'utf8');
    return fallback;
  }
}

export function saveOperatorState(next: OperatorState): OperatorState {
  ensureDataDir();
  const safe: OperatorState = {
    tradingEnabled: !!next.tradingEnabled,
    lastUpdated: next.lastUpdated || new Date().toISOString(),
  };
  fs.writeFileSync(STATE_FILE, JSON.stringify(safe, null, 2), 'utf8');
  return safe;
}
