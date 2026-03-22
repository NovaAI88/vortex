// VORTEX — Execution Mode Controller
//
// ENVIRONMENT SEPARATION RULES:
//   PAPER_TRADING — default, always safe. All trades routed through mock adapter.
//   LIVE_TRADING  — future, not implemented. Requires explicit operator unlock + env flag.
//   OFF           — no execution. Pipeline drops all requests.
//
// AI layer MUST NOT call setEngineMode() or any execution functions directly.
// Only the operator API may change mode.
//
// Live trading path is structurally blocked until VORTEX_LIVE_TRADING_ENABLED=true
// is explicitly set in the environment AND operator provides a secondary confirmation.
// This is not a runtime toggle — it requires a deliberate deployment decision.

export enum EngineMode {
  OFF = 'OFF',
  PAPER_TRADING = 'PAPER_TRADING',
  LIVE_TRADING = 'LIVE_TRADING',
}

// Default: PAPER_TRADING. Never default to LIVE_TRADING.
let mode: EngineMode = EngineMode.PAPER_TRADING;

const LIVE_TRADING_ENV_FLAG = process.env.VORTEX_LIVE_TRADING_ENABLED === 'true';

export function setEngineMode(next: EngineMode | string): { success: boolean; reason?: string } {
  if (!Object.values(EngineMode).includes(next as EngineMode)) {
    return { success: false, reason: `Invalid engine mode: ${next}` };
  }

  // Live trading is structurally gated — env flag must be explicitly set
  if (next === EngineMode.LIVE_TRADING && !LIVE_TRADING_ENV_FLAG) {
    return {
      success: false,
      reason: 'Live trading is not enabled. Set VORTEX_LIVE_TRADING_ENABLED=true in environment to unlock.',
    };
  }

  mode = next as EngineMode;
  return { success: true };
}

export function getEngineMode(): EngineMode {
  return mode;
}

export function isLiveTradingEnabled(): boolean {
  return LIVE_TRADING_ENV_FLAG;
}

export function isPaperTradingMode(): boolean {
  return mode === EngineMode.PAPER_TRADING;
}

export function isExecutionOff(): boolean {
  return mode === EngineMode.OFF;
}
