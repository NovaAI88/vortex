// VORTEX — Live Data Extractor (Phase 6)
//
// Reads live paper-trading data from:
//   - executionLog.getRecentExecutions()  → in-memory ring buffer (last 20)
//   - portfolioLedger.getPortfolio()       → balance, equity, realized PnL, trade history
//
// The portfolio's globalBook.trades array holds the most complete trade history
// (up to 500 entries). We use that as the primary source.
//
// Returns LiveStats. Does not fetch anything from network. Read-only.

import { getPortfolio }       from '../portfolio/state/portfolioLedger';
import { getRecentExecutions } from '../execution/executionLog';
import { LiveStats, LiveTrade } from './validationTypes';

export function extractLiveStats(): LiveStats {
  const portfolio = getPortfolio();
  const recentExecs = getRecentExecutions();

  // Primary trade source: portfolioLedger trade history (up to 500)
  const rawTrades: any[] = portfolio.trades ?? [];

  // Supplement with execution log for any entries not in portfolio trades
  // (shouldn't overlap, but execution log has richer metadata like strategyId)
  const execIds = new Set(recentExecs.map((e: any) => e.id ?? e.timestamp));

  const liveTrades: LiveTrade[] = rawTrades.map((t: any) => ({
    symbol:      t.symbol ?? 'BTCUSDT',
    side:        t.side   === 'buy' ? 'buy' : 'sell',
    qty:         Number(t.qty   ?? t.quantity ?? 0),
    price:       Number(t.price ?? t.fillPrice ?? 0),
    variantId:   t.variantId ?? null,
    timestamp:   t.timestamp ?? new Date().toISOString(),
    strategyId:  t.strategyId ?? 'unknown',
    realizedPnL: t.realizedPnL !== undefined ? Number(t.realizedPnL) : undefined,
    reason:      t.reason ?? t.exitReason ?? undefined,
  })).filter(t => t.qty > 0 && t.price > 0);

  return {
    totalLiveTrades: liveTrades.length,
    liveTrades,
    liveEquity:      Number(portfolio.equity ?? 10000),
    liveRealizedPnL: Number(portfolio.pnl    ?? 0),
    liveStartBalance: 10000,   // canonical start balance matches ledger default
  };
}
