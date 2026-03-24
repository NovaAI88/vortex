// Lightweight paper trading portfolio ledger with disk persistence
import fs from 'node:fs';
import path from 'node:path';
import { ExecutionResult } from '../../models/ExecutionResult';
import { recordTrade } from '../../intelligence/performance/strategyPerformanceTracker';
import { updatePortfolio } from './portfolioTracker';
import { updatePosition } from './positionTracker';

const START_BALANCE = 10000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const PORTFOLIO_FILE = path.join(DATA_DIR, 'portfolio-state.json');

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
  // Phase 4: ATR-based exit system fields
  tp1?: number | null;           // first partial-close target (1.5R)
  tp2?: number | null;           // trailing stop activation target (2R)
  tp1Hit?: boolean;              // true once TP1 partial close has been executed
  trailingStopPrice?: number | null; // current trailing stop level (null until activated)
  rMultiple?: number | null;     // R-unit (stop distance in $) for this position
  lastUpdated?: string;
};

type LedgerBook = {
  balance: number;
  equity: number;
  realizedPnL: number;
  positions: Record<string, StoredPosition>;
  trades: any[];
};

type ManualActionLedgerItem = {
  timestamp: string;
  action: string;
  target?: string;
  fraction?: number | null;
  result: 'success' | 'failed';
  realizedAmount?: number | null;
  note?: string;
};

type PersistedState = {
  globalBook: LedgerBook;
  variantBooks: Record<string, LedgerBook>;
  manualActions: ManualActionLedgerItem[];
};

function defaultBook(): LedgerBook {
  return {
    balance: START_BALANCE,
    equity: START_BALANCE,
    realizedPnL: 0,
    positions: {},
    trades: [],
  };
}

let globalBook: LedgerBook = defaultBook();
let variantBooks: Record<string, LedgerBook> = {};
let manualActions: ManualActionLedgerItem[] = [];

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function sanitizeBook(raw: any): LedgerBook {
  const b = raw && typeof raw === 'object' ? raw : {};
  return {
    balance: Number.isFinite(Number(b.balance)) ? Number(b.balance) : START_BALANCE,
    equity: Number.isFinite(Number(b.equity)) ? Number(b.equity) : START_BALANCE,
    realizedPnL: Number.isFinite(Number(b.realizedPnL)) ? Number(b.realizedPnL) : 0,
    positions: b.positions && typeof b.positions === 'object' ? b.positions : {},
    trades: Array.isArray(b.trades) ? b.trades : [],
  };
}

function persistState() {
  ensureDataDir();
  const payload: PersistedState = {
    globalBook,
    variantBooks,
    manualActions: manualActions.slice(-300),
  };
  fs.writeFileSync(PORTFOLIO_FILE, JSON.stringify(payload, null, 2), 'utf8');
}

function hydrateState() {
  ensureDataDir();
  if (!fs.existsSync(PORTFOLIO_FILE)) {
    persistState();
    return;
  }

  try {
    const raw = fs.readFileSync(PORTFOLIO_FILE, 'utf8');
    const parsed = JSON.parse(raw);

    globalBook = sanitizeBook(parsed?.globalBook);

    const vb = parsed?.variantBooks && typeof parsed.variantBooks === 'object' ? parsed.variantBooks : {};
    const sanitizedVariants: Record<string, LedgerBook> = {};
    Object.entries(vb).forEach(([k, v]) => {
      sanitizedVariants[k] = sanitizeBook(v);
    });
    variantBooks = sanitizedVariants;

    manualActions = Array.isArray(parsed?.manualActions) ? parsed.manualActions.filter(Boolean).slice(-300) : [];
  } catch {
    globalBook = defaultBook();
    variantBooks = {};
    manualActions = [];
    persistState();
  }
}

hydrateState();

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
    tp1: null,
    tp2: null,
    tp1Hit: false,
    trailingStopPrice: null,
    rMultiple: null,
    lastUpdated: new Date().toISOString(),
  };
}

function getOrCreateVariantBook(variantId?: string | null): LedgerBook {
  const key = variantKey(variantId);
  if (!variantBooks[key]) {
    variantBooks[key] = defaultBook();
  }
  return variantBooks[key];
}

function deriveProtectiveLevels(exec: ExecutionResult | undefined, price: number, side: 'buy' | 'sell') {
  const explicitStop = Number((exec as any)?.stopLoss);
  const explicitTake = Number((exec as any)?.takeProfit);

  const stopLoss = Number.isFinite(explicitStop) && explicitStop > 0
    ? explicitStop
    : Number((side === 'buy' ? price * (1 - 0.005) : price * (1 + 0.005)).toFixed(8));

  const takeProfit = Number.isFinite(explicitTake) && explicitTake > 0
    ? explicitTake
    : Number((side === 'buy' ? price * (1 + 0.01) : price * (1 - 0.01)).toFixed(8));

  // Phase 4: ATR-based exit fields (propagated from executionPipeline via exec)
  const tp1      = Number.isFinite(Number((exec as any)?.tp1)) && Number((exec as any)?.tp1) > 0
    ? Number((exec as any).tp1) : null;
  const tp2      = Number.isFinite(Number((exec as any)?.tp2)) && Number((exec as any)?.tp2) > 0
    ? Number((exec as any).tp2) : null;
  const rMultiple = Number.isFinite(Number((exec as any)?.rMultiple)) && Number((exec as any)?.rMultiple) > 0
    ? Number((exec as any).rMultiple) : null;

  return { stopLoss, takeProfit, tp1, tp2, rMultiple };
}

function recomputeEquity(book: LedgerBook) {
  book.equity = book.balance + Object.values(book.positions).reduce((eq, p) => {
    if (p.qty === 0) return eq;
    const mark = Number(p.markPrice ?? p.avgEntry ?? 0);
    if (!Number.isFinite(mark) || mark <= 0) return eq;
    return eq + (p.qty * mark);
  }, 0);
}

function applyExecution(book: LedgerBook, positionKey: string, symbolForPosition: string, signedQty: number, price: number, variantId?: string | null, exec?: ExecutionResult) {
  if (!book.positions[positionKey]) book.positions[positionKey] = newPosition(symbolForPosition, variantId, price);
  const pos = book.positions[positionKey];

  if (pos.qty === 0) {
    pos.qty = signedQty;
    pos.avgEntry = price;
    book.balance -= price * signedQty;
    pos.markPrice = price;
    const protection = deriveProtectiveLevels(exec, price, signedQty >= 0 ? 'buy' : 'sell');
    pos.stopLoss = protection.stopLoss;
    pos.takeProfit = protection.takeProfit;
    // Phase 4: ATR-based exit fields
    pos.tp1      = protection.tp1 ?? null;
    pos.tp2      = protection.tp2 ?? null;
    pos.rMultiple = protection.rMultiple ?? null;
    pos.tp1Hit   = false;
    pos.trailingStopPrice = null;
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
      pos.stopLoss = null;
      pos.takeProfit = null;
      pos.tp1 = null;
      pos.tp2 = null;
      pos.tp1Hit = false;
      pos.trailingStopPrice = null;
      pos.rMultiple = null;
    }
  } else {
    pos.avgEntry = (pos.avgEntry * Math.abs(pos.qty) + price * Math.abs(signedQty)) / (Math.abs(pos.qty + signedQty));
    pos.qty += signedQty;
    book.balance -= price * signedQty;
    pos.markPrice = price;
    // On same-direction adds, ensure protective levels are present even if upstream omitted them.
    if ((signedQty > 0 && pos.qty > 0) || (signedQty < 0 && pos.qty < 0)) {
      const protection = deriveProtectiveLevels(exec, price, signedQty >= 0 ? 'buy' : 'sell');
      pos.stopLoss = protection.stopLoss;
      pos.takeProfit = protection.takeProfit;
    }
  }

  pos.side = pos.qty > 0 ? 'long' : pos.qty < 0 ? 'short' : 'flat';
  pos.markPrice = price;
  pos.lastUpdated = new Date().toISOString();
  pos.unrealizedPnL = pos.qty !== 0 ? (price - pos.avgEntry) * pos.qty : 0;

  if (exec) {
    book.trades.push({ ...exec, symbol: symbolForPosition, qty: signedQty, price, variantId: variantId || null, timestamp: new Date().toISOString() });
    while (book.trades.length > 500) book.trades.shift();
  }

  recomputeEquity(book);
}

// Update mark price for all positions with the given symbol.
// Called by the position monitor on each price tick to keep positions current.
export function updateMarkPrice(symbol: string, price: number): void {
  if (!Number.isFinite(price) || price <= 0) return;
  let changed = false;
  for (const pos of Object.values(globalBook.positions)) {
    if (pos.symbol === symbol && pos.qty !== 0) {
      pos.markPrice = price;
      pos.unrealizedPnL = pos.qty !== 0 ? (price - pos.avgEntry) * pos.qty : 0;
      pos.lastUpdated = new Date().toISOString();
      changed = true;
    }
  }
  for (const book of Object.values(variantBooks)) {
    for (const pos of Object.values(book.positions)) {
      if (pos.symbol === symbol && pos.qty !== 0) {
        pos.markPrice = price;
        pos.unrealizedPnL = pos.qty !== 0 ? (price - pos.avgEntry) * pos.qty : 0;
        pos.lastUpdated = new Date().toISOString();
        changed = true;
      }
    }
  }
  if (changed) persistState();
}

// Returns open positions that have stop-loss or take-profit levels set.
// The position monitor uses this to know what to watch.
export type MonitoredPosition = {
  symbol: string;
  qty: number;
  side: 'long' | 'short';
  avgEntry: number;
  markPrice: number;
  stopLoss: number | null;
  takeProfit: number | null;
  variantId: string | null;
  positionKey: string;
  // Phase 4 fields
  tp1: number | null;
  tp2: number | null;
  tp1Hit: boolean;
  trailingStopPrice: number | null;
  rMultiple: number | null;
};

export function getOpenPositionsWithProtection(): MonitoredPosition[] {
  const result: MonitoredPosition[] = [];
  for (const [key, pos] of Object.entries(globalBook.positions)) {
    if (pos.qty === 0) continue;
    if (pos.markPrice === null || pos.markPrice <= 0) continue;
    if (pos.side === 'flat') continue;
    result.push({
      symbol:           pos.symbol,
      qty:              pos.qty,
      side:             pos.side as 'long' | 'short',
      avgEntry:         pos.avgEntry,
      markPrice:        pos.markPrice,
      stopLoss:         pos.stopLoss         ?? null,
      takeProfit:       pos.takeProfit       ?? null,
      variantId:        pos.variantId        ?? null,
      positionKey:      key,
      // Phase 4
      tp1:              pos.tp1              ?? null,
      tp2:              pos.tp2              ?? null,
      tp1Hit:           pos.tp1Hit           ?? false,
      trailingStopPrice: pos.trailingStopPrice ?? null,
      rMultiple:        pos.rMultiple        ?? null,
    });
  }
  return result;
}

// Phase 4: Partially close a position (used by position monitor on TP1 hit).
// closeQty must be positive. Returns realized PnL of the partial close, or null if
// position not found / already closed.
export function partialClosePosition(
  positionKey: string,
  closeQty:    number,
  closePrice:  number,
  reason:      string,
): number | null {
  const pos = globalBook.positions[positionKey];
  if (!pos || pos.qty === 0) return null;
  if (closeQty <= 0 || !Number.isFinite(closeQty)) return null;

  const safeClose = Math.min(Math.abs(closeQty), Math.abs(pos.qty));
  const signedClose = pos.qty > 0 ? safeClose : -safeClose;

  // PnL from partial close
  const pnl = (closePrice - pos.avgEntry) * Math.abs(signedClose) * Math.sign(pos.qty);
  globalBook.realizedPnL += pnl;
  globalBook.balance += closePrice * safeClose * (pos.qty > 0 ? 1 : -1);

  // Reduce position qty — avgEntry unchanged (cost basis of remainder preserved)
  pos.qty -= signedClose;

  if (pos.qty === 0) {
    pos.side = 'flat';
    pos.stopLoss = null;
    pos.takeProfit = null;
    pos.tp1 = null;
    pos.tp2 = null;
    pos.tp1Hit = false;
    pos.trailingStopPrice = null;
    pos.rMultiple = null;
    pos.avgEntry = 0;
    pos.markPrice = closePrice;
    pos.unrealizedPnL = 0;
  } else {
    // Mark TP1 hit — trailing stop will be activated by position monitor
    pos.tp1Hit = true;
    pos.tp1 = null; // TP1 consumed — no longer a target
    pos.markPrice = closePrice;
    pos.unrealizedPnL = (closePrice - pos.avgEntry) * pos.qty;
  }

  pos.lastUpdated = new Date().toISOString();

  // Log partial close in trade history
  const tradeEntry = {
    id:          (Math.random() * 1e17).toString(36),
    symbol:      pos.symbol,
    side:        pos.qty >= 0 ? 'sell' : 'buy', // closing direction
    qty:         safeClose,
    price:       closePrice,
    variantId:   pos.variantId || null,
    realizedPnL: pnl,
    reason,
    adapter:     'positionMonitor',
    strategyId:  'position-monitor',
    status:      'simulated',
    timestamp:   new Date().toISOString(),
  };
  globalBook.trades.push(tradeEntry);
  while (globalBook.trades.length > 500) globalBook.trades.shift();

  // Mirror partial close into variant book if present
  const vKey = pos.variantId || 'default';
  if (variantBooks[vKey]) {
    const vBook = variantBooks[vKey];
    for (const vPos of Object.values(vBook.positions)) {
      if (vPos.symbol !== pos.symbol || vPos.qty === 0) continue;

      const vSafeClose = Math.min(safeClose, Math.abs(vPos.qty));
      const vSignedClose = vPos.qty > 0 ? vSafeClose : -vSafeClose;
      const vPnl = (closePrice - vPos.avgEntry) * Math.abs(vSignedClose) * Math.sign(vPos.qty);

      vBook.realizedPnL += vPnl;
      vBook.balance += closePrice * vSafeClose * (vPos.qty > 0 ? 1 : -1);
      vPos.qty -= vSignedClose;

      if (vPos.qty === 0) {
        vPos.side = 'flat';
        vPos.stopLoss = null;
        vPos.takeProfit = null;
        vPos.tp1 = null;
        vPos.tp2 = null;
        vPos.tp1Hit = false;
        vPos.trailingStopPrice = null;
        vPos.rMultiple = null;
        vPos.avgEntry = 0;
        vPos.markPrice = closePrice;
        vPos.unrealizedPnL = 0;
      } else {
        vPos.tp1Hit = true;
        vPos.tp1 = null;
        vPos.markPrice = closePrice;
        vPos.unrealizedPnL = (closePrice - vPos.avgEntry) * vPos.qty;
      }

      vPos.lastUpdated = new Date().toISOString();
      break;
    }
    recomputeEquity(vBook);
  }

  // Update equity
  recomputeEquity(globalBook);

  persistState();
  return pnl;
}

// Phase 4: Update trailing stop price in the ledger for a position.
// Called by the position monitor after advanceTrail() to keep ledger in sync.
export function updateTrailingStopPrice(positionKey: string, trailingStopPrice: number): void {
  const pos = globalBook.positions[positionKey];
  if (!pos || pos.qty === 0) return;
  pos.trailingStopPrice = trailingStopPrice;
  pos.lastUpdated = new Date().toISOString();
  persistState();
}

// Force-close a position by key (used by position monitor).
// Returns realized PnL of the close, or null if no position found.
export function forceClosePosition(positionKey: string, closePrice: number, reason: string): number | null {
  const pos = globalBook.positions[positionKey];
  if (!pos || pos.qty === 0) return null;

  const signedQty = pos.qty;
  const closeQty = Math.abs(signedQty);
  const pnl = (closePrice - pos.avgEntry) * signedQty;

  globalBook.realizedPnL += pnl;
  globalBook.balance += closePrice * closeQty * (signedQty > 0 ? 1 : -1);

  pos.qty = 0;
  pos.side = 'flat';
  pos.markPrice = closePrice;
  pos.unrealizedPnL = 0;
  pos.avgEntry = 0;
  pos.stopLoss = null;
  pos.takeProfit = null;
  pos.tp1 = null;
  pos.tp2 = null;
  pos.tp1Hit = false;
  pos.trailingStopPrice = null;
  pos.rMultiple = null;
  pos.lastUpdated = new Date().toISOString();

  // Mirror close in variant book if present
  const vKey = pos.variantId || 'default';
  if (variantBooks[vKey]) {
    const vBook = variantBooks[vKey];
    for (const [k, vPos] of Object.entries(vBook.positions)) {
      if (vPos.symbol === pos.symbol && vPos.qty !== 0) {
        const vPnl = (closePrice - vPos.avgEntry) * vPos.qty;
        vBook.realizedPnL += vPnl;
        vBook.balance += closePrice * Math.abs(vPos.qty) * (vPos.qty > 0 ? 1 : -1);
        vPos.qty = 0;
        vPos.side = 'flat';
        vPos.markPrice = closePrice;
        vPos.unrealizedPnL = 0;
        vPos.stopLoss = null;
        vPos.takeProfit = null;
        vPos.lastUpdated = new Date().toISOString();
      }
    }
    recomputeEquity(vBook);
  }

  recomputeEquity(globalBook);

  // Append to book.trades so monitor-triggered closes appear in frontend trade history,
  // consistent with normal closes via applyExecution(). PnL/balance accounting is unchanged.
  const tradeEntry = {
    id: (Math.random() * 1e17).toString(36),
    symbol: pos.symbol,
    side: signedQty > 0 ? 'sell' : 'buy', // closing direction is opposite of held position
    qty: closeQty,
    price: closePrice,
    variantId: pos.variantId || null,
    realizedPnL: pnl,
    reason,
    adapter: 'positionMonitor',
    strategyId: 'position-monitor',
    status: 'simulated',
    timestamp: new Date().toISOString(),
  };
  globalBook.trades.push(tradeEntry);
  while (globalBook.trades.length > 500) globalBook.trades.shift();

  persistState();
  return pnl;
}

export function appendManualAction(action: ManualActionLedgerItem) {
  manualActions.unshift(action);
  manualActions = manualActions.slice(0, 300);
  persistState();
}

export function getManualActions() {
  return manualActions.slice(0, 100);
}

export function resetPortfolio() {
  globalBook = defaultBook();
  variantBooks = {};
  manualActions = [];
  persistState();
}

export function recordExecution(exec: ExecutionResult) {
  if (!exec || exec.status !== 'simulated') return;
  if (!exec.qty || exec.qty <= 0) return;

  try { recordTrade(exec); } catch {}

  const symbol = exec.symbol || 'BTCUSDT';
  const vId = exec.variantId || null;
  const signedQty = exec.side === 'buy' ? exec.qty : -exec.qty;
  const price = Number(exec.price || (exec as any).fillPrice || (exec as any).avgPrice || 0);

  const globalPositionKey = compositePositionKey(symbol, vId);
  applyExecution(globalBook, globalPositionKey, symbol, signedQty, price, vId, exec);

  const vBook = getOrCreateVariantBook(vId);
  applyExecution(vBook, symbol, symbol, signedQty, price, vId, exec);

  updatePortfolio(exec);
  updatePosition(exec);
  persistState();
}

export function getPortfolio() {
  const frontendPositions = Object.values(globalBook.positions)
    .filter((pos) => pos.qty !== 0)
    .map((pos) => ({
      symbol:           pos.symbol,
      side:             pos.side,
      qty:              pos.qty,
      avgEntry:         pos.avgEntry,
      markPrice:        pos.markPrice,
      unrealizedPnL:    pos.unrealizedPnL,
      variantId:        pos.variantId || null,
      plannedEntry:     pos.plannedEntry,
      stopLoss:         pos.stopLoss,
      takeProfit:       pos.takeProfit,
      // Phase 4
      tp1:              pos.tp1              ?? null,
      tp2:              pos.tp2              ?? null,
      tp1Hit:           pos.tp1Hit           ?? false,
      trailingStopPrice: pos.trailingStopPrice ?? null,
      rMultiple:        pos.rMultiple        ?? null,
      lastUpdated:      pos.lastUpdated,
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
        stopLoss: p.stopLoss,
        takeProfit: p.takeProfit,
        lastUpdated: p.lastUpdated,
      })),
    trades: book.trades.slice(-20).reverse(),
  }));

  return {
    balance: Number(globalBook.balance.toFixed(2)),
    equity: Number(globalBook.equity.toFixed(2)),
    positions: frontendPositions,
    pnl: Number(globalBook.realizedPnL.toFixed(2)),
    trades: globalBook.trades.slice(-100).reverse(),
    totalValue: Number(globalBook.equity.toFixed(2)),
    cash: Number(globalBook.balance.toFixed(2)),
    positionsValue: Number(positionsValue.toFixed(2)),
    variantPortfolios,
    manualActions: getManualActions(),
  };
}
