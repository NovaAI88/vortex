// Centralized global risk controls for AETHER
import { getPortfolio } from '../portfolio/state/portfolioLedger';

const maxDrawdownPercent = 20;
const dailyLossLimitPercent = 5;
const maxPositionSizePercent = 10;
let peakEquity: number|undefined = undefined;
let killSwitch = false;
let lastDailyCheck = '';
let dailyStartEquity: number|undefined = undefined;

export function checkLimits(): { allowed: boolean, blockedBy?: string } {
  const p = getPortfolio();
  // Defensive: fall back if portfolio is missing/broken
  const equity = (p && typeof p.equity === 'number' && isFinite(p.equity) && p.equity > 0) ? p.equity : 10000;
  const positions = (p && typeof p.positions === 'object' && p.positions !== null) ? p.positions : {};
  if (!p) return { allowed: true };
  const now = new Date();
  const day = now.toISOString().slice(0,10);
  // Lazy-initialize from actual portfolio equity on first valid data
  if (peakEquity === undefined || Number.isNaN(peakEquity)) peakEquity = equity;
  if (dailyStartEquity === undefined || Number.isNaN(dailyStartEquity)) dailyStartEquity = equity;
  if (lastDailyCheck !== day) {
    lastDailyCheck = day;
    dailyStartEquity = equity;
  }
  if (equity > peakEquity) peakEquity = equity;

  const drawdown = ((peakEquity - equity) / peakEquity) * 100;
  const dailyLoss = ((dailyStartEquity - equity) / dailyStartEquity) * 100;
  let maxPos = 0;
  Object.values(positions).forEach((pos: any) => {
    if (pos && typeof pos.qty === 'number' && typeof pos.avgEntry === 'number') {
      if (Math.abs(pos.qty * pos.avgEntry) > maxPos) maxPos = Math.abs(pos.qty * pos.avgEntry);
    }
  });
  const maxPosPercent = equity > 0 ? (maxPos / equity) * 100 : 0;

  if (drawdown >= maxDrawdownPercent) { killSwitch = true; return { allowed: false, blockedBy: 'drawdown' }; }
  if (dailyLoss >= dailyLossLimitPercent) { killSwitch = true; return { allowed: false, blockedBy: 'daily_loss' }; }
  if (maxPosPercent >= maxPositionSizePercent) return { allowed: false, blockedBy: 'max_position' };
  if (killSwitch) return { allowed: false, blockedBy: 'killswitch_active' };
  return { allowed: true };
}

export function getStatus() {
  return {
    maxDrawdownPercent,
    dailyLossLimitPercent,
    maxPositionSizePercent,
    killSwitch,
    tradingAllowed: !killSwitch,
    peakEquity: peakEquity === undefined ? null : Number(peakEquity.toFixed(2))
  };
}
