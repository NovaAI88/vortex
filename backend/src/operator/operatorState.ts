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
  persist({ tradingEnabled: false });
  return state;
}

export function startTrading(): OperatorState {
  persist({ tradingEnabled: true });
  return state;
}

export function getOperatorState(): OperatorState {
  return { ...state };
}
