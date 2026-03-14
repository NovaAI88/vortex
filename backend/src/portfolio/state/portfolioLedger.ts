// Lightweight paper trading portfolio ledger
import { ExecutionResult } from '../../models/ExecutionResult';

const START_BALANCE = 10000;
let balance = START_BALANCE; // Available cash
let equity = START_BALANCE; // Last equity
let positions: Record<string, { qty: number; avgEntry: number }> = {};
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

export function recordExecution(exec: ExecutionResult) {
  if (!exec || exec.status !== 'simulated') return;
  try { recordTrade(exec); } catch {}
  const symbol = exec.symbol || 'BTCUSDT';
  const qty = exec.side === 'buy' ? 1 : -1;
  const price = Number(exec.price || exec.fillPrice || exec.avgPrice || 0);
  if (!positions[symbol]) positions[symbol] = { qty: 0, avgEntry: price };
  let pos = positions[symbol];

  // Open/close logic (naive FIFO)
  if (pos.qty === 0) {
    // New position
    pos.qty = qty;
    pos.avgEntry = price;
    balance -= qty > 0 ? price : 0; // Long entry costs cash
    // Short not handled: PNL only
  } else if ((pos.qty > 0 && qty < 0) || (pos.qty < 0 && qty > 0)) {
    // Closing or reducing
    const closeQty = Math.min(Math.abs(qty), Math.abs(pos.qty));
    const pnl = (price - pos.avgEntry) * closeQty * Math.sign(pos.qty);
    realizedPnL += pnl;
    balance += price * closeQty;
    pos.qty += qty;
    if (pos.qty === 0) pos.avgEntry = 0;
  } else {
    // Add to position
    pos.avgEntry = (pos.avgEntry * Math.abs(pos.qty) + price * Math.abs(qty)) / (Math.abs(pos.qty + qty));
    pos.qty += qty;
    balance -= qty > 0 ? price : 0;
  }
  trades.push({ ...exec, symbol, qty, price, timestamp: new Date().toISOString() });
  equity = balance + Object.keys(positions).reduce((eq, s) => {
    const p = positions[s];
    if (p.qty === 0) return eq;
    const mark = price;
    if (p.qty > 0) {
      eq += p.qty * mark; // long: mark-to-market like before
    } else if (p.qty < 0) {
      eq += (-p.qty) * (p.avgEntry - mark); // short: unrealized PnL, no notional subtraction
    }
    return eq;
  }, 0);
}

export function getPortfolio() {
  return {
    balance: Number(balance.toFixed(2)),
    equity: Number(equity.toFixed(2)),
    positions,
    pnl: Number(realizedPnL.toFixed(2)),
    trades: trades.slice(-20).reverse()
  };
}
