// Central in-memory state for minimal engine state API
export type EnginePanelState = {
  paused: boolean,
  mode: string,
  activeVariant: 'v1'|'v2'|'v3';
};

const state: EnginePanelState = {
  paused: false,
  mode: 'PAPER_TRADING',
  activeVariant: 'v1',
};

export function getEnginePanelState(): EnginePanelState {
  return state;
}
// (In future: add mutators for POST endpoints)
