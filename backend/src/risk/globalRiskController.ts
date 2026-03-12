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
  if (!p) return { allowed: true };
  const now = new Date();
  const day = now.toISOString().slice(0,10);
  // Lazy-initialize from actual portfolio equity on first valid data
  if (peakEquity === undefined || Number.isNaN(peakEquity)) peakEquity = p.equity;
  if (dailyStartEquity === undefined || Number.isNaN(dailyStartEquity)) dailyStartEquity = p.equity;
  if (lastDailyCheck !== day) {
    lastDailyCheck = day;
    dailyStartEquity = p.equity;
  }
  if (p.equity > peakEquity) peakEquity = p.equity;

  const drawdown = ((peakEquity - p.equity) / peakEquity) * 100;
  const dailyLoss = ((dailyStartEquity - p.equity) / dailyStartEquity) * 100;
  let maxPos = 0;
  Object.values(p.positions).forEach((pos: any) => {
    if (Math.abs(pos.qty * pos.avgEntry) > maxPos) maxPos = Math.abs(pos.qty * pos.avgEntry);
  });
  const maxPosPercent = (maxPos / p.equity) * 100;

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
