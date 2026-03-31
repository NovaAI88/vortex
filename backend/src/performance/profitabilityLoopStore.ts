import fs from 'node:fs';
import path from 'node:path';
import { ProfitabilityLoopSnapshot } from './profitabilityLoop';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_STATE_FILE = path.join(DATA_DIR, 'profitability-loop-state.json');
const SNAPSHOT_CAP = 500;

type StoredProfitabilityLoopState = {
  snapshots: ProfitabilityLoopSnapshot[];
};

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getProfitabilityLoopStateFilePath(): string {
  const envPath = process.env.PROFITABILITY_LOOP_STATE_FILE;
  if (typeof envPath === 'string' && envPath.trim().length > 0) {
    return path.resolve(envPath.trim());
  }
  return DEFAULT_STATE_FILE;
}

export function loadProfitabilityLoopHistory(): ProfitabilityLoopSnapshot[] {
  const filePath = getProfitabilityLoopStateFilePath();
  if (!fs.existsSync(filePath)) return [];

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8')) as StoredProfitabilityLoopState;
    if (!Array.isArray(raw?.snapshots)) return [];
    return raw.snapshots.filter(Boolean).slice(-SNAPSHOT_CAP);
  } catch {
    return [];
  }
}

export function appendProfitabilityLoopSnapshot(snapshot: ProfitabilityLoopSnapshot): void {
  const next = loadProfitabilityLoopHistory();
  next.push(snapshot);
  const trimmed = next.slice(-SNAPSHOT_CAP);
  ensureDataDir();
  fs.writeFileSync(
    getProfitabilityLoopStateFilePath(),
    JSON.stringify({ snapshots: trimmed }, null, 2),
    'utf8',
  );
}
