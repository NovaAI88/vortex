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

const SUCCESS_PCT = 0.005;
const FAILURE_PCT = -0.0075;
const TIMEOUT_TICKS = 10;
const COMPLETED_SIGNALS_CAP = 1000;

const activeSignals = new Map<string, SignalTrack>();
const completedSignals: SignalTrack[] = [];

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
  return Array.from(activeSignals.values()).map(x => ({ ...x }));
}

export function getCompletedSignalTracks(): SignalTrack[] {
  return completedSignals.map(x => ({ ...x }));
}

export function resetSignalOutcomeTrackerForTesting(): void {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('resetSignalOutcomeTrackerForTesting is test-only and requires NODE_ENV=test');
  }

  activeSignals.clear();
  completedSignals.length = 0;
}
