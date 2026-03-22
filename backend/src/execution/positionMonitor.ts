// VORTEX — Position Monitor
//
// Polls open positions at a configurable interval and enforces stop-loss
// and take-profit levels by synthesizing closing executions.
//
// DESIGN RULES:
// 1. This is NOT the strategy pipeline. It does not route through signal → decision → risk.
//    It is an operator-level safety mechanism. Exits bypass entry pipeline deliberately.
// 2. Position close is atomic in the ledger BEFORE the event is published.
//    This prevents double-close races.
// 3. All closes are logged to the audit log and published to the event bus.
// 4. Stale price guard: monitor skips action if last price is older than STALE_MS.
// 5. Monitor only runs in PAPER_TRADING mode — never in LIVE_TRADING (not implemented).
// 6. AI layer MUST NOT call any function in this file.

import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { logger } from '../utils/logger';
import {
  getOpenPositionsWithProtection,
  forceClosePosition,
  updateMarkPrice,
} from '../portfolio/state/portfolioLedger';
import { getLatestPrice, getLatestPriceAge } from '../market/marketPriceBuffer';
import { logExecution } from './executionLog';
import { recordTradeOutcome } from './circuitBreaker';
import { getEngineMode, EngineMode } from './mode/executionMode';

// Polling interval (ms). Default: 5 seconds.
const MONITOR_INTERVAL_MS = Math.max(
  1000,
  Number(process.env.VORTEX_MONITOR_INTERVAL_MS ?? 5000)
);

// Price staleness gate (ms). If latest price is older than this, skip all checks.
// This prevents acting on an outdated price during a WebSocket outage.
const STALE_PRICE_MS = Math.max(
  5000,
  Number(process.env.VORTEX_MONITOR_STALE_PRICE_MS ?? 15000)
);

// Symbol scope — current implementation monitors BTCUSDT only.
// Extend when multi-symbol support is added.
const MONITORED_SYMBOL = 'BTCUSDT';

let monitorTimer: NodeJS.Timeout | null = null;
let bus: EventBus | null = null;

function buildCloseResult(
  positionKey: string,
  symbol: string,
  side: 'long' | 'short',
  qty: number,
  closePrice: number,
  variantId: string | null,
  triggerReason: 'stop_loss' | 'take_profit',
  pnl: number
): any {
  const closeSide: 'buy' | 'sell' = side === 'long' ? 'sell' : 'buy';
  return {
    id: (Math.random() * 1e17).toString(36),
    executionRequestId: `monitor-${positionKey}`,
    riskDecisionId: `monitor-${positionKey}`,
    actionCandidateId: `monitor-${positionKey}`,
    signalId: `monitor-${positionKey}`,
    strategyId: 'position-monitor',
    symbol,
    side: closeSide,
    price: closePrice,
    qty: Math.abs(qty),
    variantId,
    status: 'simulated',
    reason: `Position monitor ${triggerReason === 'stop_loss' ? 'stop-loss' : 'take-profit'} triggered. PnL: ${pnl.toFixed(2)}`,
    adapter: 'positionMonitor',
    timestamp: new Date().toISOString(),
    monitorTrigger: triggerReason,
    realizedPnL: pnl,
  };
}

function checkPosition(
  symbol: string,
  qty: number,
  side: 'long' | 'short',
  markPrice: number,
  stopLoss: number | null,
  takeProfit: number | null,
  variantId: string | null,
  positionKey: string,
  currentPrice: number
): void {
  const isLong = side === 'long';

  const stopBreached = stopLoss !== null && (
    isLong ? currentPrice <= stopLoss : currentPrice >= stopLoss
  );

  const tpBreached = takeProfit !== null && (
    isLong ? currentPrice >= takeProfit : currentPrice <= takeProfit
  );

  if (!stopBreached && !tpBreached) return;

  const triggerReason: 'stop_loss' | 'take_profit' = stopBreached ? 'stop_loss' : 'take_profit';

  logger.warn('positionMonitor', `${triggerReason.replace('_', '-')} breach detected`, {
    symbol, side, variantId, currentPrice, stopLoss, takeProfit, triggerReason,
  });

  // Atomically close position in ledger FIRST — prevents double-close
  const pnl = forceClosePosition(positionKey, currentPrice, triggerReason);

  if (pnl === null) {
    logger.info('positionMonitor', 'Position already closed — skipping duplicate close', { symbol, positionKey });
    return;
  }

  logger.info('positionMonitor', 'Position closed', { symbol, side, variantId, pnl: Number(pnl.toFixed(2)), triggerReason });

  const closeResult = buildCloseResult(
    positionKey, symbol, side, qty, currentPrice, variantId, triggerReason, pnl
  );

  // Log to audit trail
  try { logExecution(closeResult); } catch (e) {}

  // Record outcome in circuit breaker
  try { recordTradeOutcome(pnl, symbol, triggerReason); } catch (e) {}

  // Publish close event to bus so API/frontend can react
  if (bus) {
    try {
      bus.publish(EVENT_TOPICS.POSITION_MONITOR_CLOSE, closeResult, 'position-monitor');
      bus.publish(EVENT_TOPICS.EXECUTION_RESULT, closeResult, 'position-monitor');
    } catch (e) {}
  }
}

function runMonitorCycle(): void {
  // Only run in paper trading mode
  if (getEngineMode() !== EngineMode.PAPER_TRADING) return;

  // Staleness check — skip everything if price feed is stale
  const priceAge = getLatestPriceAge(MONITORED_SYMBOL);
  if (!Number.isFinite(priceAge) || priceAge > STALE_PRICE_MS) {
    // Silent skip — this is normal during brief reconnects
    return;
  }

  const latestPrice = getLatestPrice(MONITORED_SYMBOL);
  if (!latestPrice || !Number.isFinite(latestPrice.price) || latestPrice.price <= 0) return;

  const currentPrice = latestPrice.price;

  // Update mark prices in portfolio
  try { updateMarkPrice(MONITORED_SYMBOL, currentPrice); } catch (e) {}

  // Check each monitored position
  const positions = getOpenPositionsWithProtection();
  for (const pos of positions) {
    if (pos.symbol !== MONITORED_SYMBOL) continue;
    try {
      checkPosition(
        pos.symbol,
        pos.qty,
        pos.side,
        pos.markPrice,
        pos.stopLoss,
        pos.takeProfit,
        pos.variantId,
        pos.positionKey,
        currentPrice
      );
    } catch (e) {
      logger.error('positionMonitor', 'Error checking position', { err: String(e) });
    }
  }
}

export function startPositionMonitor(eventBus: EventBus): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }

  bus = eventBus;

  logger.info('positionMonitor', 'Starting', { intervalMs: MONITOR_INTERVAL_MS, stalePriceMs: STALE_PRICE_MS });

  monitorTimer = setInterval(() => {
    try { runMonitorCycle(); } catch (e) {
      logger.error('positionMonitor', 'Unexpected error in monitor cycle', { err: String(e) });
    }
  }, MONITOR_INTERVAL_MS);
}

export function stopPositionMonitor(): void {
  if (monitorTimer) {
    clearInterval(monitorTimer);
    monitorTimer = null;
  }
  logger.info('positionMonitor', 'Stopped');
}

export function getMonitorStatus(): {
  running: boolean;
  intervalMs: number;
  stalePriceMs: number;
  monitoredSymbol: string;
  openPositionCount: number;
} {
  return {
    running: monitorTimer !== null,
    intervalMs: MONITOR_INTERVAL_MS,
    stalePriceMs: STALE_PRICE_MS,
    monitoredSymbol: MONITORED_SYMBOL,
    openPositionCount: getOpenPositionsWithProtection().length,
  };
}
