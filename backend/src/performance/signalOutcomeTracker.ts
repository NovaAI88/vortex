import fs from 'node:fs';
import path from 'node:path';

export type SignalOutcome = 'success' | 'failure' | 'timeout';
export type TriggerMode = 'rsi_extreme' | 'context_confirmed' | null;

export interface SignalTrack {
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  entryTick: number;
  triggerMode: TriggerMode;
  confidence: number;
  rsi14AtSignal: number | null;
  rangeLocationAtSignal: number | null;
  mfePct: number;
  maePct: number;
  lastTickSeen: number;
  ticksElapsed: number;
  outcome: SignalOutcome | null;
  resolvedAtTick: number | null;
}

export interface TrackSignalInput {
  signalId: string;
  symbol: string;
  side: 'buy' | 'sell';
  entryPrice: number;
  entryTick: number;
  triggerMode: TriggerMode;
  confidence: number;
  rsi14AtSignal: number | null;
  rangeLocationAtSignal: number | null;
}

export interface TickUpdateInput {
  symbol: string;
  price: number;
  tickIndex: number;
}

interface TriggerModeMetrics {
  completed: number;
  success: number;
  failure: number;
  timeout: number;
  successRate: number;
  avgMfePct: number;
  avgMaePct: number;
}

export interface SignalMetrics {
  totals: {
    tracked: number;
    active: number;
    completed: number;
    success: number;
    failure: number;
    timeout: number;
  };
  rates: {
    successRate: number;
    failureRate: number;
    timeoutRate: number;
  };
  excursions: {
    avgMfePct: number;
    avgMaePct: number;
  };
  byTriggerMode: {
    rsi_extreme: TriggerModeMetrics;
    context_confirmed: TriggerModeMetrics;
    unknown: TriggerModeMetrics;
  };
  avgMfePctByTriggerMode: {
    rsi_extreme: number;
    context_confirmed: number;
    unknown: number;
  };
  avgMaePctByTriggerMode: {
    rsi_extreme: number;
    context_confirmed: number;
    unknown: number;
  };
}

export interface SignalVerificationSnapshot {
  filters: {
    triggerMode: 'all' | 'rsi_extreme' | 'context_confirmed' | 'unknown';
    status: 'all' | 'active' | 'completed';
    limit: number;
  };
  summary: {
    active: number;
    completed: number;
    persisted: number;
    byOutcome: {
      success: number;
      failure: number;
      timeout: number;
    };
    byTriggerMode: {
      rsi_extreme: number;
      context_confirmed: number;
      unknown: number;
    };
  };
  active: SignalTrack[];
  completed: SignalTrack[];
  persistence: {
    stateFile: string;
    exists: boolean;
  };
}

const SUCCESS_PCT = 0.005;
const FAILURE_PCT = -0.0075;
const TIMEOUT_TICKS = 10;
const COMPLETED_SIGNALS_CAP = 1000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DEFAULT_STATE_FILE = path.join(DATA_DIR, 'signal-outcome-state.json');

const activeSignals = new Map<string, SignalTrack>();
const completedSignals: SignalTrack[] = [];

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

export function getSignalOutcomeStateFilePath(): string {
  const envPath = process.env.SIGNAL_OUTCOME_STATE_FILE;
  if (typeof envPath === 'string' && envPath.trim().length > 0) {
    return path.resolve(envPath.trim());
  }
  return DEFAULT_STATE_FILE;
}

function cloneTrack(track: SignalTrack): SignalTrack {
  return { ...track };
}

function persistSignalState(): void {
  try {
    const filePath = getSignalOutcomeStateFilePath();
    ensureDataDir();
    fs.writeFileSync(
      filePath,
      JSON.stringify(
        {
          activeSignals: Array.from(activeSignals.values()).map(cloneTrack),
          completedSignals: completedSignals.map(cloneTrack).slice(-COMPLETED_SIGNALS_CAP),
        },
        null,
        2,
      ),
      'utf8',
    );
  } catch {
    // Persistence failure must not break runtime signal flow.
  }
}

function normalizeTrack(raw: any): SignalTrack | null {
  if (!raw || typeof raw !== 'object') return null;
  if (typeof raw.signalId !== 'string' || raw.signalId.trim().length === 0) return null;
  if (typeof raw.symbol !== 'string' || raw.symbol.trim().length === 0) return null;
  if (raw.side !== 'buy' && raw.side !== 'sell') return null;
  if (!Number.isFinite(raw.entryPrice)) return null;
  if (!Number.isFinite(raw.entryTick)) return null;

  const triggerMode: TriggerMode = raw.triggerMode === 'rsi_extreme' || raw.triggerMode === 'context_confirmed'
    ? raw.triggerMode
    : null;
  const outcome: SignalOutcome | null = raw.outcome === 'success' || raw.outcome === 'failure' || raw.outcome === 'timeout'
    ? raw.outcome
    : null;

  return {
    signalId: raw.signalId,
    symbol: raw.symbol,
    side: raw.side,
    entryPrice: Number(raw.entryPrice),
    entryTick: Number(raw.entryTick),
    triggerMode,
    confidence: Number.isFinite(raw.confidence) ? Number(raw.confidence) : 0,
    rsi14AtSignal: Number.isFinite(raw.rsi14AtSignal) ? Number(raw.rsi14AtSignal) : null,
    rangeLocationAtSignal: Number.isFinite(raw.rangeLocationAtSignal) ? Number(raw.rangeLocationAtSignal) : null,
    mfePct: Number.isFinite(raw.mfePct) ? Number(raw.mfePct) : 0,
    maePct: Number.isFinite(raw.maePct) ? Number(raw.maePct) : 0,
    lastTickSeen: Number.isFinite(raw.lastTickSeen) ? Number(raw.lastTickSeen) : Number(raw.entryTick),
    ticksElapsed: Number.isFinite(raw.ticksElapsed) ? Number(raw.ticksElapsed) : 0,
    outcome,
    resolvedAtTick: Number.isFinite(raw.resolvedAtTick) ? Number(raw.resolvedAtTick) : null,
  };
}

function hydrateSignalState(): void {
  activeSignals.clear();
  completedSignals.length = 0;

  const filePath = getSignalOutcomeStateFilePath();
  if (!fs.existsSync(filePath)) return;

  try {
    const raw = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const nextActive = Array.isArray(raw?.activeSignals) ? raw.activeSignals : [];
    const nextCompleted = Array.isArray(raw?.completedSignals) ? raw.completedSignals : [];

    for (const entry of nextActive) {
      const track = normalizeTrack(entry);
      if (!track || track.outcome) continue;
      activeSignals.set(track.signalId, track);
    }

    for (const entry of nextCompleted) {
      const track = normalizeTrack(entry);
      if (!track || !track.outcome) continue;
      completedSignals.push(track);
    }

    if (completedSignals.length > COMPLETED_SIGNALS_CAP) {
      completedSignals.splice(0, completedSignals.length - COMPLETED_SIGNALS_CAP);
    }
  } catch {
    activeSignals.clear();
    completedSignals.length = 0;
  }
}

hydrateSignalState();

function pctForSide(side: 'buy' | 'sell', entryPrice: number, price: number): number {
  return side === 'buy'
    ? (price - entryPrice) / entryPrice
    : (entryPrice - price) / entryPrice;
}

function toRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Number((numerator / denominator).toFixed(6));
}

function toAvg(total: number, count: number): number {
  if (count <= 0) return 0;
  return Number((total / count).toFixed(6));
}

function modeKey(mode: TriggerMode): 'rsi_extreme' | 'context_confirmed' | 'unknown' {
  if (mode === 'rsi_extreme') return 'rsi_extreme';
  if (mode === 'context_confirmed') return 'context_confirmed';
  return 'unknown';
}

export function trackSignal(input: TrackSignalInput): void {
  if (typeof input.signalId !== 'string' || input.signalId.trim().length === 0) {
    throw new Error('trackSignal requires non-empty string signalId');
  }
  if (!Number.isFinite(input.entryPrice)) {
    throw new Error(`trackSignal requires finite entryPrice for signalId=${input.signalId}`);
  }
  if (activeSignals.has(input.signalId)) {
    throw new Error(`Duplicate active signalId rejected: ${input.signalId}`);
  }

  activeSignals.set(input.signalId, {
    ...input,
    mfePct: 0,
    maePct: 0,
    lastTickSeen: input.entryTick,
    ticksElapsed: 0,
    outcome: null,
    resolvedAtTick: null,
  });
  persistSignalState();
}

export function updateSignalOutcomesForTick(input: TickUpdateInput): void {
  if (!Number.isFinite(input.price)) return;

  for (const [signalId, track] of activeSignals.entries()) {
    if (track.symbol !== input.symbol) continue;

    const deltaPct = pctForSide(track.side, track.entryPrice, input.price);
    track.mfePct = Math.max(track.mfePct, deltaPct);
    track.maePct = Math.min(track.maePct, deltaPct);
    track.lastTickSeen = input.tickIndex;
    track.ticksElapsed = input.tickIndex - track.entryTick;

    let outcome: SignalOutcome | null = null;
    // Deterministic resolution order per tick: success → failure → timeout.
    if (deltaPct >= SUCCESS_PCT) {
      outcome = 'success';
    } else if (deltaPct <= FAILURE_PCT) {
      outcome = 'failure';
    } else if (track.ticksElapsed >= TIMEOUT_TICKS) {
      outcome = 'timeout';
    }

    if (!outcome) continue;

    const resolved: SignalTrack = {
      ...track,
      outcome,
      resolvedAtTick: input.tickIndex,
    };

    activeSignals.delete(signalId);
    completedSignals.push(resolved);
    if (completedSignals.length > COMPLETED_SIGNALS_CAP) {
      completedSignals.splice(0, completedSignals.length - COMPLETED_SIGNALS_CAP);
    }
  }

  persistSignalState();
}

export function getSignalMetrics(): SignalMetrics {
  let success = 0;
  let failure = 0;
  let timeout = 0;

  let mfeTotal = 0;
  let maeTotal = 0;

  const byMode = {
    rsi_extreme: { completed: 0, success: 0, failure: 0, timeout: 0, mfeTotal: 0, maeTotal: 0 },
    context_confirmed: { completed: 0, success: 0, failure: 0, timeout: 0, mfeTotal: 0, maeTotal: 0 },
    unknown: { completed: 0, success: 0, failure: 0, timeout: 0, mfeTotal: 0, maeTotal: 0 },
  };

  for (const track of completedSignals) {
    if (track.outcome === 'success') success++;
    else if (track.outcome === 'failure') failure++;
    else if (track.outcome === 'timeout') timeout++;

    mfeTotal += track.mfePct;
    maeTotal += track.maePct;

    const key = modeKey(track.triggerMode);
    byMode[key].completed++;
    byMode[key].mfeTotal += track.mfePct;
    byMode[key].maeTotal += track.maePct;

    if (track.outcome === 'success') byMode[key].success++;
    else if (track.outcome === 'failure') byMode[key].failure++;
    else if (track.outcome === 'timeout') byMode[key].timeout++;
  }

  const active = activeSignals.size;
  const completed = completedSignals.length;
  const tracked = active + completed;

  const modeMetrics = {
    rsi_extreme: {
      completed: byMode.rsi_extreme.completed,
      success: byMode.rsi_extreme.success,
      failure: byMode.rsi_extreme.failure,
      timeout: byMode.rsi_extreme.timeout,
      successRate: toRate(byMode.rsi_extreme.success, byMode.rsi_extreme.completed),
      avgMfePct: toAvg(byMode.rsi_extreme.mfeTotal, byMode.rsi_extreme.completed),
      avgMaePct: toAvg(byMode.rsi_extreme.maeTotal, byMode.rsi_extreme.completed),
    },
    context_confirmed: {
      completed: byMode.context_confirmed.completed,
      success: byMode.context_confirmed.success,
      failure: byMode.context_confirmed.failure,
      timeout: byMode.context_confirmed.timeout,
      successRate: toRate(byMode.context_confirmed.success, byMode.context_confirmed.completed),
      avgMfePct: toAvg(byMode.context_confirmed.mfeTotal, byMode.context_confirmed.completed),
      avgMaePct: toAvg(byMode.context_confirmed.maeTotal, byMode.context_confirmed.completed),
    },
    unknown: {
      completed: byMode.unknown.completed,
      success: byMode.unknown.success,
      failure: byMode.unknown.failure,
      timeout: byMode.unknown.timeout,
      successRate: toRate(byMode.unknown.success, byMode.unknown.completed),
      avgMfePct: toAvg(byMode.unknown.mfeTotal, byMode.unknown.completed),
      avgMaePct: toAvg(byMode.unknown.maeTotal, byMode.unknown.completed),
    },
  };

  return {
    totals: {
      tracked,
      active,
      completed,
      success,
      failure,
      timeout,
    },
    rates: {
      successRate: toRate(success, completed),
      failureRate: toRate(failure, completed),
      timeoutRate: toRate(timeout, completed),
    },
    excursions: {
      avgMfePct: toAvg(mfeTotal, completed),
      avgMaePct: toAvg(maeTotal, completed),
    },
    byTriggerMode: modeMetrics,
    avgMfePctByTriggerMode: {
      rsi_extreme: modeMetrics.rsi_extreme.avgMfePct,
      context_confirmed: modeMetrics.context_confirmed.avgMfePct,
      unknown: modeMetrics.unknown.avgMfePct,
    },
    avgMaePctByTriggerMode: {
      rsi_extreme: modeMetrics.rsi_extreme.avgMaePct,
      context_confirmed: modeMetrics.context_confirmed.avgMaePct,
      unknown: modeMetrics.unknown.avgMaePct,
    },
  };
}

export function getActiveSignalTracks(): SignalTrack[] {
  return Array.from(activeSignals.values()).map(cloneTrack);
}

export function getCompletedSignalTracks(): SignalTrack[] {
  return completedSignals.map(cloneTrack);
}

function toVerificationTriggerMode(mode: TriggerMode): 'rsi_extreme' | 'context_confirmed' | 'unknown' {
  return modeKey(mode);
}

function matchesTriggerMode(
  track: SignalTrack,
  triggerMode: 'all' | 'rsi_extreme' | 'context_confirmed' | 'unknown',
): boolean {
  return triggerMode === 'all' || toVerificationTriggerMode(track.triggerMode) === triggerMode;
}

export function getSignalVerificationSnapshot(options?: {
  triggerMode?: 'all' | 'rsi_extreme' | 'context_confirmed' | 'unknown';
  status?: 'all' | 'active' | 'completed';
  limit?: number;
}): SignalVerificationSnapshot {
  const triggerMode = options?.triggerMode ?? 'all';
  const status = options?.status ?? 'all';
  const limit = Number.isFinite(options?.limit)
    ? Math.max(1, Math.trunc(options?.limit as number))
    : 50;

  const filteredActive = getActiveSignalTracks().filter((track) => matchesTriggerMode(track, triggerMode));
  const filteredCompleted = getCompletedSignalTracks().filter((track) => matchesTriggerMode(track, triggerMode));
  const limitedCompleted = filteredCompleted.slice(-limit).reverse();

  const persisted = filteredActive.length + filteredCompleted.length;
  const summary = {
    active: filteredActive.length,
    completed: filteredCompleted.length,
    persisted,
    byOutcome: {
      success: filteredCompleted.filter((track) => track.outcome === 'success').length,
      failure: filteredCompleted.filter((track) => track.outcome === 'failure').length,
      timeout: filteredCompleted.filter((track) => track.outcome === 'timeout').length,
    },
    byTriggerMode: {
      rsi_extreme: 0,
      context_confirmed: 0,
      unknown: 0,
    },
  };

  for (const track of [...filteredActive, ...filteredCompleted]) {
    summary.byTriggerMode[toVerificationTriggerMode(track.triggerMode)]++;
  }

  return {
    filters: {
      triggerMode,
      status,
      limit,
    },
    summary,
    active: status === 'completed' ? [] : filteredActive,
    completed: status === 'active' ? [] : limitedCompleted,
    persistence: {
      stateFile: getSignalOutcomeStateFilePath(),
      exists: fs.existsSync(getSignalOutcomeStateFilePath()),
    },
  };
}

export function reloadSignalOutcomeTrackerFromPersistence(): void {
  hydrateSignalState();
}

export function resetSignalOutcomeTrackerForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetSignalOutcomeTrackerForTesting is test-only and requires NODE_ENV=test');
  }

  activeSignals.clear();
  completedSignals.length = 0;

  const filePath = getSignalOutcomeStateFilePath();
  if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true });
}
