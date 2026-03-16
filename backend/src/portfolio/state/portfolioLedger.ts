// Lightweight paper trading portfolio ledger
import { ExecutionResult } from '../../models/ExecutionResult';
import { recordTrade } from '../../intelligence/performance/strategyPerformanceTracker';
import { updatePortfolio } from './portfolioTracker';
import { updatePosition } from './positionTracker';

const START_BALANCE = 10000;

type StoredPosition = {
  qty: number;
  avgEntry: number;
  symbol: string;
  side: 'long' | 'short' | 'flat';
  markPrice: number | null;
  unrealizedPnL: number;
  variantId?: string | null;
  plannedEntry?: number | null;
  stopLoss?: number | null;
  takeProfit?: number | null;
  lastUpdated?: string;
};

type LedgerBook = {
  balance: number;
  equity: number;
  realizedPnL: number;
  positions: Record<string, StoredPosition>;
  trades: any[];
};

let globalBook: LedgerBook = {
  balance: START_BALANCE,
  equity: START_BALANCE,
  realizedPnL: 0,
  positions: {}, // key: symbol::variant
  trades: [],
};

let variantBooks: Record<string, LedgerBook> = {};

function variantKey(variantId?: string | null) {
  return variantId || 'default';
}

function compositePositionKey(symbol: string, variantId?: string | null) {
  return `${symbol}::${variantKey(variantId)}`;
}

function newPosition(symbol: string, variantId?: string | null, price = 0): StoredPosition {
  return {
    qty: 0,
    avgEntry: price,
    symbol,
    side: 'flat',
    markPrice: null,
    unrealizedPnL: 0,
    variantId: variantId || null,
    plannedEntry: null,
    stopLoss: null,
    takeProfit: null,
    lastUpdated: new Date().toISOString(),
  };
}

function getOrCreateVariantBook(variantId?: string | null): LedgerBook {
  const key = variantKey(variantId);
  if (!variantBooks[key]) {
    variantBooks[key] = {
      balance: START_BALANCE,
      equity: START_BALANCE,
      realizedPnL: 0,
      positions: {}, // key: symbol only inside a variant book
      trades: [],
    };
  }
  return variantBooks[key];
}

function applyExecution(book: LedgerBook, positionKey: string, symbolForPosition: string, signedQty: number, price: number, variantId?: string | null, exec?: ExecutionResult) {
  if (!book.positions[positionKey]) book.positions[positionKey] = newPosition(symbolForPosition, variantId, price);
  const pos = book.positions[positionKey];

  if (pos.qty === 0) {
    pos.qty = signedQty;
    pos.avgEntry = price;
    if (signedQty > 0) book.balance -= price * Math.abs(signedQty);
    pos.markPrice = price;
  } else if ((pos.qty > 0 && signedQty < 0) || (pos.qty < 0 && signedQty > 0)) {
    const closeQty = Math.min(Math.abs(signedQty), Math.abs(pos.qty));
    const pnl = (price - pos.avgEntry) * closeQty * Math.sign(pos.qty);
    book.realizedPnL += pnl;
    book.balance += price * closeQty * (signedQty < 0 ? 1 : -1);
    pos.qty += signedQty;

    if (pos.qty === 0) {
      pos.avgEntry = 0;
      pos.markPrice = null;
      pos.unrealizedPnL = 0;
      pos.side = 'flat';
    }
  } else {
    pos.avgEntry = (pos.avgEntry * Math.abs(pos.qty) + price * Math.abs(signedQty)) / (Math.abs(pos.qty + signedQty));
    pos.qty += signedQty;
    if (signedQty > 0) book.balance -= price * Math.abs(signedQty);
    pos.markPrice = price;
  }

  pos.side = pos.qty > 0 ? 'long' : pos.qty < 0 ? 'short' : 'flat';
  pos.markPrice = price;
  pos.lastUpdated = new Date().toISOString();
  pos.unrealizedPnL = pos.qty !== 0 ? (price - pos.avgEntry) * pos.qty : 0;

  if (exec) {
    book.trades.push({ ...exec, symbol: symbolForPosition, qty: signedQty, price, variantId: variantId || null, timestamp: new Date().toISOString() });
  }

  book.equity = book.balance + Object.values(book.positions).reduce((eq, p) => {
    if (p.qty === 0) return eq;
    if (p.qty > 0) eq += p.qty * price;
    else eq += Math.abs(p.qty) * (p.avgEntry - price);
    return eq;
  }, 0);
}

export function resetPortfolio() {
  globalBook = {
    balance: START_BALANCE,
    equity: START_BALANCE,
    realizedPnL: 0,
    positions: {},
    trades: [],
  };
  variantBooks = {};
}

export function recordExecution(exec: ExecutionResult) {
  if (!exec || exec.status !== 'simulated') return;
  if (!exec.qty || exec.qty <= 0) return;

  try { recordTrade(exec); } catch {}

  const symbol = exec.symbol || 'BTCUSDT';
  const vId = exec.variantId || null;
  const signedQty = exec.side === 'buy' ? exec.qty : -exec.qty;
  const price = Number(exec.price || exec.fillPrice || exec.avgPrice || 0);

  const globalPositionKey = compositePositionKey(symbol, vId);
  applyExecution(globalBook, globalPositionKey, symbol, signedQty, price, vId, exec);

  const vBook = getOrCreateVariantBook(vId);
  applyExecution(vBook, symbol, symbol, signedQty, price, vId, exec);

  updatePortfolio(exec);
  updatePosition(exec);
}

export function getPortfolio() {
  const frontendPositions = Object.values(globalBook.positions)
    .filter((pos) => pos.qty !== 0)
    .map((pos) => ({
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
      lastUpdated: pos.lastUpdated,
    }));

  const positionsValue = Object.values(globalBook.positions).reduce((val, p) => {
    if (p.qty !== 0 && p.markPrice) val += Math.abs(p.qty) * p.markPrice;
    return val;
  }, 0);

  const variantPortfolios = Object.entries(variantBooks).map(([id, book]) => ({
    variantId: id,
    balance: Number(book.balance.toFixed(2)),
    equity: Number(book.equity.toFixed(2)),
    pnl: Number(book.realizedPnL.toFixed(2)),
    positions: Object.values(book.positions)
      .filter((p) => p.qty !== 0)
      .map((p) => ({
        symbol: p.symbol,
        side: p.side,
        qty: p.qty,
        avgEntry: p.avgEntry,
        markPrice: p.markPrice,
        unrealizedPnL: p.unrealizedPnL,
        variantId: id,
        lastUpdated: p.lastUpdated,
      })),
    trades: book.trades.slice(-20).reverse(),
  }));

  return {
    balance: Number(globalBook.balance.toFixed(2)),
    equity: Number(globalBook.equity.toFixed(2)),
    positions: frontendPositions,
    pnl: Number(globalBook.realizedPnL.toFixed(2)),
    trades: globalBook.trades.slice(-20).reverse(),
    totalValue: Number(globalBook.equity.toFixed(2)),
    cash: Number(globalBook.balance.toFixed(2)),
    positionsValue: Number(positionsValue.toFixed(2)),
    variantPortfolios,
  };
}
