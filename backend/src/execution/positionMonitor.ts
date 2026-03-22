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
  partialClosePosition,
  updateTrailingStopPrice,
  updateMarkPrice,
} from '../portfolio/state/portfolioLedger';
import {
  activateTrail,
  advanceTrail,
  isTrailBreached,
  getTrail,
  removeTrail,
} from './trailingStopState';
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

// ─── TP1 partial close size (50% of qty) ────────────────────────────────────
const TP1_CLOSE_PCT = Math.min(1, Math.max(0.1,
  Number(process.env.VORTEX_TP1_CLOSE_PCT ?? 0.5)
));

// ─── Minimum qty remaining after partial close ───────────────────────────────
// If remaining qty after partial would be below this, do a full close instead.
const MIN_REMAINING_QTY = Math.max(0.000001,
  Number(process.env.VORTEX_MIN_TRADE_QTY ?? 0.000001)
);

function checkPosition(
  pos: ReturnType<typeof getOpenPositionsWithProtection>[number],
  currentPrice: number
): void {
  const { symbol, qty, side, avgEntry, stopLoss, takeProfit, variantId, positionKey,
          tp1, tp1Hit, trailingStopPrice, rMultiple } = pos;
  const isLong = side === 'long';

  // ── Phase 4: Trailing stop check (highest priority after TP1 hit) ────────
  if (tp1Hit) {
    // Advance the trail to new peak (monotonic — never loosens)
    const trail = advanceTrail(positionKey, currentPrice);

    if (trail) {
      // Sync trailing stop price back to ledger for persistence + API visibility
      try { updateTrailingStopPrice(positionKey, trail.trailPrice); } catch (e) {}

      // Check breach
      if (isTrailBreached(positionKey, currentPrice)) {
        logger.warn('positionMonitor', 'Trailing stop breached — closing remaining position', {
          symbol, side, variantId, currentPrice, trailPrice: trail.trailPrice, positionKey,
        });

        removeTrail(positionKey);
        const pnl = forceClosePosition(positionKey, currentPrice, 'trailing_stop');
        if (pnl === null) return; // already closed

        logger.info('positionMonitor', 'Trailing stop close complete', {
          symbol, side, variantId, pnl: Number(pnl.toFixed(2)),
        });

        const closeResult = buildCloseResult(
          positionKey, symbol, side, qty, currentPrice, variantId, 'stop_loss', pnl
        );
        closeResult.reason = `Trailing stop triggered at ${trail.trailPrice}. PnL: ${pnl.toFixed(2)}`;
        closeResult.monitorTrigger = 'trailing_stop';

        try { logExecution(closeResult); } catch (e) {}
        try { recordTradeOutcome(pnl, symbol, 'trailing_stop'); } catch (e) {}
        if (bus) {
          try {
            bus.publish(EVENT_TOPICS.POSITION_MONITOR_CLOSE, closeResult, 'position-monitor');
            bus.publish(EVENT_TOPICS.EXECUTION_RESULT, closeResult, 'position-monitor');
          } catch (e) {}
        }
        return;
      }
    }

    // Trail active but not breached — no further checks needed
    // (stop_loss and full TP are superseded once trailing is active)
    return;
  }

  // ── Phase 4: TP1 partial close (1.5R target) ────────────────────────────
  const tp1Breached = tp1 !== null && (
    isLong ? currentPrice >= tp1 : currentPrice <= tp1
  );

  if (tp1Breached) {
    const closeQty = Number((Math.abs(qty) * TP1_CLOSE_PCT).toFixed(6));
    const remainingQty = Math.abs(qty) - closeQty;

    // If remainder would be too small, convert to a full close
    if (remainingQty < MIN_REMAINING_QTY) {
      logger.info('positionMonitor', 'TP1 hit — remaining qty too small for partial, doing full close', {
        symbol, side, variantId, currentPrice, tp1, qty, closeQty, remainingQty,
      });
      const pnl = forceClosePosition(positionKey, currentPrice, 'take_profit');
      if (pnl === null) return;
      removeTrail(positionKey);
      const closeResult = buildCloseResult(positionKey, symbol, side, qty, currentPrice, variantId, 'take_profit', pnl);
      try { logExecution(closeResult); } catch (e) {}
      try { recordTradeOutcome(pnl, symbol, 'take_profit'); } catch (e) {}
      if (bus) {
        try {
          bus.publish(EVENT_TOPICS.POSITION_MONITOR_CLOSE, closeResult, 'position-monitor');
          bus.publish(EVENT_TOPICS.EXECUTION_RESULT, closeResult, 'position-monitor');
        } catch (e) {}
      }
      return;
    }

    // Partial close
    logger.info('positionMonitor', `TP1 hit — partial close ${(TP1_CLOSE_PCT * 100).toFixed(0)}% of position`, {
      symbol, side, variantId, currentPrice, tp1, closeQty, remainingQty,
    });

    const pnl = partialClosePosition(positionKey, closeQty, currentPrice, 'partial_tp1');
    if (pnl === null) return; // already closed or invalid

    logger.info('positionMonitor', 'Partial TP1 close complete — activating trailing stop', {
      symbol, side, variantId, pnl: Number(pnl.toFixed(2)), remainingQty,
    });

    // Activate trailing stop for remaining position
    // Initial trail = breakeven (avgEntry). entryR from position's rMultiple.
    const safeR = (rMultiple && rMultiple > 0) ? rMultiple : (Math.abs(avgEntry) * 0.005);
    activateTrail(positionKey, side, avgEntry, safeR);

    // Publish partial close event
    const partialResult = {
      ...buildCloseResult(positionKey, symbol, side, closeQty, currentPrice, variantId, 'take_profit', pnl),
      monitorTrigger: 'partial_tp1',
      reason: `TP1 partial close (${(TP1_CLOSE_PCT * 100).toFixed(0)}%) at ${currentPrice}. PnL: ${pnl.toFixed(2)}. Trailing stop activated at breakeven (${avgEntry}).`,
    };
    try { logExecution(partialResult); } catch (e) {}
    try { recordTradeOutcome(pnl, symbol, 'partial_tp1'); } catch (e) {}
    if (bus) {
      try {
        bus.publish(EVENT_TOPICS.POSITION_MONITOR_CLOSE, partialResult, 'position-monitor');
        bus.publish(EVENT_TOPICS.EXECUTION_RESULT, partialResult, 'position-monitor');
      } catch (e) {}
    }
    return;
  }

  // ── Hard stop-loss / full take-profit (existing behavior, unchanged) ─────
  const stopBreached = stopLoss !== null && (
    isLong ? currentPrice <= stopLoss : currentPrice >= stopLoss
  );
  const fullTpBreached = takeProfit !== null && (
    isLong ? currentPrice >= takeProfit : currentPrice <= takeProfit
  );

  if (!stopBreached && !fullTpBreached) return;

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

  removeTrail(positionKey); // clean up any trail state

  logger.info('positionMonitor', 'Position closed', { symbol, side, variantId, pnl: Number(pnl.toFixed(2)), triggerReason });

  const closeResult = buildCloseResult(
    positionKey, symbol, side, qty, currentPrice, variantId, triggerReason, pnl
  );

  try { logExecution(closeResult); } catch (e) {}
  try { recordTradeOutcome(pnl, symbol, triggerReason); } catch (e) {}

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
      checkPosition(pos, currentPrice);
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
