import fs from 'node:fs';
import path from 'node:path';
import { BacktestState, BacktestStatus } from './backtestTypes';

interface StoredBacktestState {
  status: BacktestStatus;
  progress?: number;
  error?: string;
  result?: unknown;
}

export interface LoadedBacktestState {
  state: BacktestState;
  loadedFromDisk: boolean;
  loadError: string | null;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_STATE_FILE = path.join(DATA_DIR, 'backtest-state.json');

const EMPTY_STATE: BacktestState = { status: 'idle' };

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getBacktestStateFilePath(): string {
  const envPath = process.env.BACKTEST_STATE_FILE;
  if (typeof envPath === 'string' && envPath.trim().length > 0) {
    return path.resolve(envPath.trim());
  }
  return DEFAULT_STATE_FILE;
}

function normalizeStatus(value: unknown): BacktestStatus | null {
  if (value === 'idle' || value === 'running' || value === 'done' || value === 'error') return value;
  return null;
}

function sanitizeState(raw: StoredBacktestState): BacktestState {
  const status = normalizeStatus(raw?.status) ?? 'idle';
  const next: BacktestState = { status };

  if (typeof raw?.error === 'string') {
    next.error = raw.error;
  }

  if (Number.isFinite(raw?.progress)) {
    next.progress = Math.max(0, Math.min(100, Number(raw.progress)));
  }

  if (raw?.result && typeof raw.result === 'object') {
    next.result = raw.result as BacktestState['result'];
  }

  if (status !== 'running' && typeof next.progress !== 'number') {
    next.progress = status === 'done' ? 100 : 0;
  }

  return next;
}

function serializeState(state: BacktestState): StoredBacktestState {
  const safeStatus = normalizeStatus(state.status) ?? 'idle';
  const out: StoredBacktestState = { status: safeStatus };

  if (typeof state.error === 'string') out.error = state.error;
  if (Number.isFinite(state.progress)) out.progress = Number(state.progress);
  if (state.result && typeof state.result === 'object') out.result = state.result;

  return out;
}

export function loadBacktestState(): LoadedBacktestState {
  const filePath = getBacktestStateFilePath();

  if (!fs.existsSync(filePath)) {
    return { state: { ...EMPTY_STATE }, loadedFromDisk: false, loadError: null };
  }

  try {
    const rawText = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(rawText) as StoredBacktestState;
    return {
      state: sanitizeState(parsed),
      loadedFromDisk: true,
      loadError: null,
    };
  } catch (err: any) {
    return {
      state: { ...EMPTY_STATE },
      loadedFromDisk: false,
      loadError: String(err?.message ?? err),
    };
  }
}

export function saveBacktestState(state: BacktestState): void {
  const filePath = getBacktestStateFilePath();
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(serializeState(state), null, 2), 'utf8');
}
