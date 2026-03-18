// Centralized global risk controls for AETHER
import { getPortfolio } from '../portfolio/state/portfolioLedger';
import { isRiskOverrideActive } from '../operator/operatorState';

const maxDrawdownPercent = 20;
const dailyLossLimitPercent = 5;
const maxPositionSizePercent = 15;
let peakEquity: number | undefined = undefined;
let killSwitch = false;
let lastDailyCheck = '';
let dailyStartEquity: number | undefined = undefined;
let lastBlockReason: string | null = null;
let lastBlockTimestamp: string | null = null;

const riskEvents: Array<{ timestamp: string; action: string; reason?: string; meta?: any }> = [];

function pushRiskEvent(action: string, reason?: string, meta?: any) {
  riskEvents.unshift({ timestamp: new Date().toISOString(), action, reason, meta });
  while (riskEvents.length > 100) riskEvents.pop();
}

function computeMetrics() {
  const p = getPortfolio();
  const equity = (p && typeof p.equity === 'number' && isFinite(p.equity) && p.equity > 0) ? p.equity : 10000;
  const positions = Array.isArray((p as any)?.positions) ? (p as any).positions : [];
  const now = new Date();
  const day = now.toISOString().slice(0, 10);

  if (peakEquity === undefined || Number.isNaN(peakEquity)) peakEquity = equity;
  if (dailyStartEquity === undefined || Number.isNaN(dailyStartEquity)) dailyStartEquity = equity;
  if (lastDailyCheck !== day) {
    lastDailyCheck = day;
    dailyStartEquity = equity;
  }
  if (equity > (peakEquity || equity)) peakEquity = equity;

  const drawdown = peakEquity ? ((peakEquity - equity) / peakEquity) * 100 : 0;
  const dailyLoss = dailyStartEquity ? ((dailyStartEquity - equity) / dailyStartEquity) * 100 : 0;

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

  return {
    portfolio: p,
    equity,
    positions,
    drawdown,
    dailyLoss,
    maxPos,
    maxPosPercent,
    baselineEquity: dailyStartEquity || equity,
    peakEquity: peakEquity || equity,
  };
}

export function checkLimits(candidate?: { side?: 'buy' | 'sell'; symbol?: string; variantId?: string }): { allowed: boolean, blockedBy?: string } {
  const { portfolio, equity, positions, drawdown, dailyLoss, maxPosPercent } = computeMetrics();

  if (!portfolio) return { allowed: true };

  const overrideActive = isRiskOverrideActive();

  if (drawdown >= maxDrawdownPercent && !overrideActive) {
    killSwitch = true;
    lastBlockReason = 'drawdown';
    lastBlockTimestamp = new Date().toISOString();
    return { allowed: false, blockedBy: 'drawdown' };
  }

  if (dailyLoss >= dailyLossLimitPercent && !overrideActive) {
    killSwitch = true;
    lastBlockReason = 'daily_loss';
    lastBlockTimestamp = new Date().toISOString();
    return { allowed: false, blockedBy: 'daily_loss' };
  }

  const isReducingTrade = (() => {
    if (!candidate || !candidate.side || !candidate.symbol || !Array.isArray((portfolio as any)?.positions)) return false;
    const variantId = candidate.variantId || null;
    const pos = (portfolio as any).positions.find((x: any) => x.symbol === candidate.symbol && (variantId ? (x.variantId || null) === variantId : true));
    if (!pos || typeof pos.qty !== 'number') return false;
    if (candidate.side === 'sell' && pos.qty > 0) return true;
    if (candidate.side === 'buy' && pos.qty < 0) return true;
    return false;
  })();

  if (maxPosPercent >= maxPositionSizePercent && !isReducingTrade) {
    lastBlockReason = 'max_position';
    lastBlockTimestamp = new Date().toISOString();
    return { allowed: false, blockedBy: 'max_position' };
  }

  if (killSwitch && !overrideActive) {
    lastBlockReason = lastBlockReason || 'killswitch_active';
    lastBlockTimestamp = new Date().toISOString();
    return { allowed: false, blockedBy: 'killswitch_active' };
  }

  return { allowed: true };
}

export function getStatus() {
  const metrics = computeMetrics();
  const activeBlockReason = killSwitch
    ? (metrics.drawdown >= maxDrawdownPercent
      ? 'drawdown'
      : (metrics.dailyLoss >= dailyLossLimitPercent ? 'daily_loss' : (lastBlockReason || 'killswitch_active')))
    : null;

  const overrideActive = isRiskOverrideActive();
  const tradingAllowed = overrideActive || (!killSwitch && metrics.drawdown < maxDrawdownPercent && metrics.dailyLoss < dailyLossLimitPercent);

  return {
    maxDrawdownPercent,
    dailyLossLimitPercent,
    maxPositionSizePercent,
    killSwitch,
    tradingAllowed,
    activeBlockReason,
    blockScope: activeBlockReason ? 'global' : null,
    currentEquity: Number(metrics.equity.toFixed(2)),
    baselineEquity: Number(metrics.baselineEquity.toFixed(2)),
    peakEquity: Number(metrics.peakEquity.toFixed(2)),
    currentDailyPnl: Number((metrics.equity - metrics.baselineEquity).toFixed(2)),
    dailyLossPercent: Number(metrics.dailyLoss.toFixed(4)),
    drawdownPercent: Number(metrics.drawdown.toFixed(4)),
    threshold: {
      dailyLossPercent: dailyLossLimitPercent,
      drawdownPercent: maxDrawdownPercent,
      maxPositionSizePercent,
    },
    lastBlockReason,
    lastBlockTimestamp,
    riskOverrideActive: overrideActive,
    riskEvents: riskEvents.slice(0, 30),
  };
}

export function resetRiskState(reason = 'operator_reset') {
  peakEquity = undefined;
  killSwitch = false;
  lastDailyCheck = '';
  dailyStartEquity = undefined;
  lastBlockReason = null;
  lastBlockTimestamp = null;
  pushRiskEvent('risk_reset', reason);
}

export function addRiskEvent(action: string, reason?: string, meta?: any) {
  pushRiskEvent(action, reason, meta);
}
