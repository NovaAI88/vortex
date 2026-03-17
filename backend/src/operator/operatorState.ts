import { loadOperatorState, saveOperatorState, OperatorState } from './operatorStateStore';

let state: OperatorState = loadOperatorState();

function persist(partial: Partial<OperatorState>) {
  state = saveOperatorState({
    ...state,
    ...partial,
    lastUpdated: new Date().toISOString(),
  });
}

export function isTradingEnabled(): boolean {
  return !!state.tradingEnabled;
}

export function pauseTrading(): OperatorState {
  persist({ tradingEnabled: false, lastAction: 'pause' });
  return state;
}

export function startTrading(): OperatorState {
  persist({ tradingEnabled: true, lastAction: 'start' });
  return state;
}

export function setRiskOverride(minutes = 15): OperatorState {
  const clamped = Math.max(1, Math.min(240, Number(minutes) || 15));
  const until = new Date(Date.now() + clamped * 60_000).toISOString();
  persist({ riskOverrideUntil: until, lastAction: `override_${clamped}m` });
  return state;
}

export function clearRiskOverride(): OperatorState {
  persist({ riskOverrideUntil: null, lastAction: 'override_cleared' });
  return state;
}

export function isRiskOverrideActive(): boolean {
  const until = state?.riskOverrideUntil;
  if (!until) return false;
  const ts = new Date(until).getTime();
  if (!Number.isFinite(ts)) return false;
  if (Date.now() > ts) {
    clearRiskOverride();
    return false;
  }
  return true;
}

export function getOperatorState(): OperatorState {
  return { ...state, riskOverrideActive: isRiskOverrideActive() } as any;
}
