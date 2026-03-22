// VORTEX — Circuit Breaker (Consecutive Loss Guard)
//
// Tracks recent trade outcomes and auto-pauses trading when consecutive
// losses exceed the configured threshold within the time window.
//
// Design:
// - Only counts losses (realized PnL < 0) from monitor-triggered closes
// - "Consecutive" means N losses in a row without a winning trade in between
// - Window: losses older than WINDOW_MS are discarded (sliding window)
// - Trigger: N consecutive losses within WINDOW_MS → call pauseTrading()
//
// This is not a drawdown guard (that is globalRiskController's job).
// This is a trade-frequency safety valve: if the strategy keeps losing fast, stop.
//
// AI layer MUST NOT call any function in this file.

import { pauseTrading } from '../operator/operatorState';
import { addRiskEvent } from '../risk/globalRiskController';

const MAX_CONSECUTIVE_LOSSES = Number(process.env.VORTEX_CIRCUIT_BREAKER_MAX_LOSSES ?? 5);
const WINDOW_MS = Number(process.env.VORTEX_CIRCUIT_BREAKER_WINDOW_MS ?? 10 * 60 * 1000); // 10 minutes

type TradeOutcome = {
  timestamp: number;
  pnl: number;
  symbol: string;
  reason: string;
};

const recentOutcomes: TradeOutcome[] = [];

function pruneOldOutcomes(): void {
  const cutoff = Date.now() - WINDOW_MS;
  while (recentOutcomes.length > 0 && recentOutcomes[0].timestamp < cutoff) {
    recentOutcomes.shift();
  }
}

function countConsecutiveLosses(): number {
  let count = 0;
  // Count from most recent backwards
  for (let i = recentOutcomes.length - 1; i >= 0; i--) {
    if (recentOutcomes[i].pnl < 0) {
      count++;
    } else {
      break; // winning trade breaks the streak
    }
  }
  return count;
}

export function recordTradeOutcome(pnl: number, symbol: string, reason: string): void {
  pruneOldOutcomes();

  recentOutcomes.push({
    timestamp: Date.now(),
    pnl,
    symbol,
    reason,
  });

  // Keep bounded — don't let it grow unbounded
  if (recentOutcomes.length > 100) recentOutcomes.shift();

  const consecutiveLosses = countConsecutiveLosses();

  if (consecutiveLosses >= MAX_CONSECUTIVE_LOSSES) {
    const msg = `Circuit breaker triggered: ${consecutiveLosses} consecutive losses within ${WINDOW_MS / 1000}s window`;
    console.warn(`[CIRCUIT BREAKER] ${msg}`);

    try {
      pauseTrading();
      addRiskEvent('circuit_breaker_triggered', msg, { consecutiveLosses, symbol, windowMs: WINDOW_MS });
    } catch (e) {
      console.error('[CIRCUIT BREAKER] Failed to pause trading:', e);
    }
  }
}

export function getCircuitBreakerState(): {
  consecutiveLosses: number;
  recentOutcomeCount: number;
  windowMs: number;
  maxConsecutiveLosses: number;
} {
  pruneOldOutcomes();
  return {
    consecutiveLosses: countConsecutiveLosses(),
    recentOutcomeCount: recentOutcomes.length,
    windowMs: WINDOW_MS,
    maxConsecutiveLosses: MAX_CONSECUTIVE_LOSSES,
  };
}
