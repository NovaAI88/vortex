// Lightweight paper trading portfolio ledger
import { ExecutionResult } from '../../models/ExecutionResult';

const START_BALANCE = 10000;
let balance = START_BALANCE; // Available cash
let equity = START_BALANCE; // Last equity
type StoredPosition = {
  qty: number;
  avgEntry: number;
  symbol: string;
  side: 'long' | 'short' | 'flat';
  markPrice: number | null;
  unrealizedPnL: number;
  realizedPnL?: number;
  variantId?: string | null;
  plannedEntry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lastUpdated?: string;
};
let positions: Record<string, StoredPosition> = {};

let trades: any[] = [];
let realizedPnL = 0;

export function resetPortfolio() {
  balance = START_BALANCE;
  equity = START_BALANCE;
  positions = {};
  trades = [];
  realizedPnL = 0;
}

import { recordTrade } from '../../intelligence/performance/strategyPerformanceTracker';
import { updatePortfolio } from './portfolioTracker';
import { updatePosition } from './positionTracker';

export function recordExecution(exec: ExecutionResult) {
  if (!exec || exec.status !== 'simulated') return;
  if (!exec.qty || exec.qty <= 0) {
    console.error('Invalid qty in execution:', exec);
    return;
  }
  try { recordTrade(exec); } catch {}
  const symbol = exec.symbol || 'BTCUSDT';
  const signedQty = exec.side === 'buy' ? exec.qty : -exec.qty;
  const price = Number(exec.price || exec.fillPrice || exec.avgPrice || 0);
  if (!positions[symbol]) positions[symbol] = {
    qty: 0, avgEntry: price, symbol,
    side: 'flat', markPrice: null, unrealizedPnL: 0,
    variantId: exec.variantId || null,
    plannedEntry: null, stopLoss: null, takeProfit: null, lastUpdated: new Date().toISOString()
  };
  let pos = positions[symbol];

  // Open/close logic (naive FIFO)
  if (pos.qty === 0) {
    // New position
    pos.qty = signedQty;
    pos.avgEntry = price;
    balance -= signedQty > 0 ? price * Math.abs(signedQty) : 0; // Long entry costs cash * qty
    pos.markPrice = price;
    pos.variantId = exec.variantId || null;
  } else if ((pos.qty > 0 && signedQty < 0) || (pos.qty < 0 && signedQty > 0)) {
    // Closing or reducing
    const closeQty = Math.min(Math.abs(signedQty), Math.abs(pos.qty));
    const pnl = (price - pos.avgEntry) * closeQty * Math.sign(pos.qty);
    realizedPnL += pnl;
    balance += price * closeQty * (signedQty < 0 ? 1 : -1); // Adjust cash for close
    pos.qty += signedQty;
    if (pos.qty === 0) {
      pos.avgEntry = 0;
      pos.markPrice = null;
      pos.unrealizedPnL = 0;
      pos.side = 'flat';
    }
  } else {
    // Add to position
    pos.avgEntry = (pos.avgEntry * Math.abs(pos.qty) + price * Math.abs(signedQty)) / (Math.abs(pos.qty + signedQty));
    pos.qty += signedQty;
    balance -= signedQty > 0 ? price * Math.abs(signedQty) : 0;
    pos.markPrice = price;
  }
  // Side and mark (after update)
  pos.side = pos.qty > 0 ? 'long' : pos.qty < 0 ? 'short' : 'flat';
  pos.markPrice = price;
  pos.lastUpdated = new Date().toISOString();
  pos.unrealizedPnL = pos.qty !== 0 ? (price - pos.avgEntry) * pos.qty : 0;
  pos.plannedEntry = null;
  pos.stopLoss = null;
  pos.takeProfit = null;
  trades.push({ ...exec, symbol, qty: signedQty, price, variantId: exec.variantId || null, timestamp: new Date().toISOString() });
  equity = balance + Object.keys(positions).reduce((eq, s) => {
    const p = positions[s];
    if (p.qty === 0) return eq;
    const mark = price;
    if (p.qty > 0) {
      eq += p.qty * mark; // long: mark-to-market like before
    } else if (p.qty < 0) {
      eq += Math.abs(p.qty) * (p.avgEntry - mark); // short: unrealized PnL, no notional subtraction
    }
    return eq;
  }, 0);
  updatePortfolio(exec);
  updatePosition(exec);
}

export function getPortfolio() {
  // Prepare positions array for frontend
  const frontendPositions = Object.values(positions).filter(pos => pos.qty !== 0).map(pos => ({
    symbol: pos.symbol,
    side: pos.side,
    qty: pos.qty,
    avgEntry: pos.avgEntry,
    markPrice: pos.markPrice,
    unrealizedPnL: pos.unrealizedPnL,
    variantId: pos.variantId || null,
    plannedEntry: pos.plannedEntry,
    stopLoss: pos.stopLoss,
    takeProfit: pos.takeProfit,
    lastUpdated: pos.lastUpdated
  }));
  const positionsValue = Object.keys(positions).reduce((val, s) => {
    const p = positions[s];
    if (p.qty !== 0 && p.markPrice) val += Math.abs(p.qty) * p.markPrice;
    return val;
  }, 0);
  return {
    balance: Number(balance.toFixed(2)),
    equity: Number(equity.toFixed(2)),
    positions: frontendPositions,
    pnl: Number(realizedPnL.toFixed(2)),
    trades: trades.slice(-20).reverse(),
    totalValue: Number(equity.toFixed(2)),
    cash: Number(balance.toFixed(2)),
    positionsValue: Number(positionsValue.toFixed(2))
  };
}
