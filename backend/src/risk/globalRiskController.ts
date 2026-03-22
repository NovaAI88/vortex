// VORTEX — Global Risk Controller
//
// Multi-layer risk enforcement: drawdown, daily loss, position size, kill switch.
//
// Kill switch and daily baseline are PERSISTED to disk.
// A restart does NOT clear the kill switch — operator must explicitly reset via API.
//
// AI layer MUST NOT call any function in this file directly.
// Risk decisions are made deterministically based on portfolio state and thresholds.

import { getPortfolio } from '../portfolio/state/portfolioLedger';
import { isRiskOverrideActive } from '../operator/operatorState';
import { loadRiskState, saveRiskState, PersistedRiskState } from './state/riskStateStore';

const maxDrawdownPercent = 20;
const dailyLossLimitPercent = 5;
const maxPositionSizePercent = 15;

// Load persisted state on startup — kill switch and daily baseline survive restarts
let persistedState: PersistedRiskState = loadRiskState();

const riskEvents: Array<{ timestamp: string; action: string; reason?: string; meta?: any }> = [];

function pushRiskEvent(action: string, reason?: string, meta?: any) {
  riskEvents.unshift({ timestamp: new Date().toISOString(), action, reason, meta });
  while (riskEvents.length > 100) riskEvents.pop();
}

function persist(patch: Partial<PersistedRiskState>) {
  persistedState = { ...persistedState, ...patch };
  try { saveRiskState(persistedState); } catch (e) {
    console.error('[RISK] Failed to persist risk state:', e);
  }
}

function computeMetrics() {
  const p = getPortfolio();
  const equity = (p && typeof p.equity === 'number' && isFinite(p.equity) && p.equity > 0) ? p.equity : 10000;
  const positions = Array.isArray((p as any)?.positions) ? (p as any).positions : [];
  const today = new Date().toISOString().slice(0, 10);

  // Persist peak equity updates
  if (equity > persistedState.peakEquity) {
    persist({ peakEquity: equity });
  }

  // Reset daily baseline if calendar day has rolled
  if (persistedState.dailyDate !== today) {
    persist({ dailyDate: today, dailyStartEquity: equity });
  }

  const drawdown = persistedState.peakEquity > 0
    ? ((persistedState.peakEquity - equity) / persistedState.peakEquity) * 100
    : 0;

  const dailyLoss = persistedState.dailyStartEquity > 0
    ? ((persistedState.dailyStartEquity - equity) / persistedState.dailyStartEquity) * 100
    : 0;

  let maxPos = 0;
  positions.forEach((pos: any) => {
    if (pos && typeof pos.qty === 'number') {
      const mark = Number(pos?.markPrice ?? pos?.avgEntry ?? 0);
      if (Number.isFinite(mark)) {
        const notional = Math.abs(pos.qty * mark);
        if (notional > maxPos) maxPos = notional;
      }
    }
  });

  const maxPosPercent = equity > 0 ? (maxPos / equity) * 100 : 0;

  return { portfolio: p, equity, positions, drawdown, dailyLoss, maxPos, maxPosPercent };
}

export function checkLimits(candidate?: { side?: 'buy' | 'sell'; symbol?: string; variantId?: string }): { allowed: boolean; blockedBy?: string } {
  const { portfolio, equity, positions, drawdown, dailyLoss, maxPosPercent } = computeMetrics();

  if (!portfolio) return { allowed: true };

  const overrideActive = isRiskOverrideActive();

  if (drawdown >= maxDrawdownPercent && !overrideActive) {
    persist({ killSwitch: true, killSwitchReason: 'drawdown', killSwitchTimestamp: new Date().toISOString() });
    pushRiskEvent('kill_switch_triggered', 'drawdown', { drawdown });
    return { allowed: false, blockedBy: 'drawdown' };
  }

  if (dailyLoss >= dailyLossLimitPercent && !overrideActive) {
    persist({ killSwitch: true, killSwitchReason: 'daily_loss', killSwitchTimestamp: new Date().toISOString() });
    pushRiskEvent('kill_switch_triggered', 'daily_loss', { dailyLoss });
    return { allowed: false, blockedBy: 'daily_loss' };
  }

  const isReducingTrade = (() => {
    if (!candidate || !candidate.side || !candidate.symbol || !Array.isArray((portfolio as any)?.positions)) return false;
    const variantId = candidate.variantId || null;
    const pos = (portfolio as any).positions.find((x: any) => x.symbol === candidate.symbol && (x.variantId || null) === variantId);
    if (!pos || typeof pos.qty !== 'number') return false;
    if (candidate.side === 'sell' && pos.qty > 0) return true;
    if (candidate.side === 'buy' && pos.qty < 0) return true;
    return false;
  })();

  if (maxPosPercent >= maxPositionSizePercent && !isReducingTrade) {
    pushRiskEvent('trade_blocked', 'max_position', { maxPosPercent });
    return { allowed: false, blockedBy: 'max_position' };
  }

  // Kill switch check — persisted, survives restarts, requires explicit operator reset
  if (persistedState.killSwitch && !overrideActive) {
    return { allowed: false, blockedBy: 'killswitch_active' };
  }

  return { allowed: true };
}

export function getStatus() {
  const metrics = computeMetrics();
  const overrideActive = isRiskOverrideActive();
  const tradingAllowed = overrideActive || (
    !persistedState.killSwitch &&
    metrics.drawdown < maxDrawdownPercent &&
    metrics.dailyLoss < dailyLossLimitPercent
  );

  const activeBlockReason = persistedState.killSwitch
    ? (metrics.drawdown >= maxDrawdownPercent ? 'drawdown'
      : metrics.dailyLoss >= dailyLossLimitPercent ? 'daily_loss'
      : persistedState.killSwitchReason || 'killswitch_active')
    : null;

  return {
    maxDrawdownPercent,
    dailyLossLimitPercent,
    maxPositionSizePercent,
    killSwitch: persistedState.killSwitch,
    killSwitchReason: persistedState.killSwitchReason,
    killSwitchTimestamp: persistedState.killSwitchTimestamp,
    tradingAllowed,
    activeBlockReason,
    blockScope: activeBlockReason ? 'global' : null,
    currentEquity: Number(metrics.equity.toFixed(2)),
    baselineEquity: Number(persistedState.dailyStartEquity.toFixed(2)),
    peakEquity: Number(persistedState.peakEquity.toFixed(2)),
    currentDailyPnl: Number((metrics.equity - persistedState.dailyStartEquity).toFixed(2)),
    dailyLossPercent: Number(metrics.dailyLoss.toFixed(4)),
    drawdownPercent: Number(metrics.drawdown.toFixed(4)),
    threshold: {
      dailyLossPercent: dailyLossLimitPercent,
      drawdownPercent: maxDrawdownPercent,
      maxPositionSizePercent,
    },
    riskOverrideActive: overrideActive,
    riskEvents: riskEvents.slice(0, 30),
  };
}

// Explicit operator reset — only path to clear kill switch
// Requires a reason to be logged. Cannot be called silently.
export function resetRiskState(reason = 'operator_reset') {
  persist({
    killSwitch: false,
    killSwitchReason: null,
    killSwitchTimestamp: null,
  });
  pushRiskEvent('risk_reset', reason);
  console.log('[RISK] Kill switch cleared by operator:', reason);
}

export function addRiskEvent(action: string, reason?: string, meta?: any) {
  pushRiskEvent(action, reason, meta);
}
