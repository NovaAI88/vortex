// VORTEX — Backtest Validator (Phase 6)
//
// Compares live paper-trading behavior to backtest expectations.
//
// Produces a ValidationReport with:
//   - Aggregate win rate / expectancyR / drawdown comparison
//   - Regime-by-regime breakdown (where live data allows)
//   - Exit distribution comparison (TP1 / trailing / stop / endOfData)
//   - Signal frequency comparison (trades per day)
//   - Overall flag: CONSISTENT / UNDERPERFORMING / OVERFIT_RISK / PARTIAL / etc.
//
// Thresholds:
//   MIN_LIVE_TRADES        = 10  (minimum for any comparison)
//   SERIOUS_LIVE_TRADES    = 20  (minimum for win rate / expectancyR comparison)
//   CONSISTENT_BAND        = 0.15  (±15%)
//   OVERFIT_GAP            = 0.30  (>30% gap = overfit risk)

import { getBacktestResult } from '../backtest/backtestRunner';
import { extractLiveStats }  from './liveDataExtractor';
import {
  ValidationReport,
  ValidationFlag,
  RegimeConsistency,
  ExitConsistency,
  LiveTrade,
} from './validationTypes';

const MIN_LIVE_TRADES     = 10;
const SERIOUS_LIVE_TRADES = 20;
const CONSISTENT_BAND     = 0.15;  // ±15%
const OVERFIT_GAP         = 0.30;  // >30% gap

export function generateValidationReport(): ValidationReport {
  const now = new Date().toISOString();
  const btResult = getBacktestResult();
  const live     = extractLiveStats();

  // ── No backtest available ────────────────────────────────────────────────
  if (!btResult) {
    return {
      generatedAt:        now,
      flag:               'NO_BACKTEST',
      summary:            'No completed backtest. Run POST /api/backtest/run first.',
      liveTrades:         live.totalLiveTrades,
      backtestTrades:     0,
      backtestWindow:     'n/a',
      hasEnoughLiveData:  live.totalLiveTrades >= MIN_LIVE_TRADES,
      btWinRate:          0, liveWinRate: null,
      btExpectancyR:      0, liveExpectancyR: null,
      btMaxDrawdown:      0, liveMaxDrawdown: null,
      btTotalReturn:      0, liveTotalReturn: null,
      winRateGap:         null, expectancyRGap: null,
      byRegime:           [],
      byExit:             [],
      btTradesPerDay:     0,
      liveTradesPerDay:   null,
      tradeFrequencyFlag: 'NO_BACKTEST',
    };
  }

  const hasEnoughLive = live.totalLiveTrades >= MIN_LIVE_TRADES;
  const isSerious     = live.totalLiveTrades >= SERIOUS_LIVE_TRADES;

  // ── Backtest baseline ────────────────────────────────────────────────────
  const btWinRate      = btResult.summary.winRate;
  const btExpectancyR  = btResult.summary.expectancyR;
  const btMaxDrawdown  = btResult.maxDrawdown;
  const btTotalReturn  = btResult.totalReturn;

  const btConfig   = btResult.config;
  const btWindow   = `${btResult.candlesUsed} × ${btConfig.interval} candles`;

  // ── Backtest trades-per-day ──────────────────────────────────────────────
  // Estimate: candlesUsed / minutesPerCandle / 1440 minutes per day
  const minutesPerCandle = btConfig.interval === '1m' ? 1 : btConfig.interval === '5m' ? 5 : 15;
  const btDays = (btResult.candlesUsed * minutesPerCandle) / 1440;
  const btTradesPerDay = btDays > 0 ? btResult.summary.totalTrades / btDays : 0;

  // ── Live metrics ─────────────────────────────────────────────────────────
  const livePnLs        = live.liveTrades.filter(t => t.realizedPnL !== undefined).map(t => t.realizedPnL!);
  const liveWins        = livePnLs.filter(p => p > 0);
  const liveLosses      = livePnLs.filter(p => p <= 0);

  const liveWinRate: number | null     = isSerious && livePnLs.length >= SERIOUS_LIVE_TRADES
    ? (liveWins.length / livePnLs.length) * 100
    : null;

  // Live expectancyR requires knowing R per trade — not available directly in ledger.
  // Approximate from realized PnL: expectancyR ≈ avgPnL / avgAbsLoss
  const liveAvgWin  = liveWins.length   > 0 ? liveWins.reduce((s, v) => s + v, 0) / liveWins.length   : null;
  const liveAvgLoss = liveLosses.length > 0 ? liveLosses.reduce((s, v) => s + Math.abs(v), 0) / liveLosses.length : null;

  const liveExpectancyR: number | null = (liveWinRate !== null && liveAvgWin !== null && liveAvgLoss !== null)
    ? ((liveWinRate / 100) * liveAvgWin - (1 - liveWinRate / 100) * liveAvgLoss) / (liveAvgLoss || 1)
    : null;

  // Live max drawdown from equity (approximated from trade PnLs)
  const liveMaxDrawdown: number | null = isSerious ? approximateMaxDrawdown(live.liveTrades) : null;

  const liveTotalReturn: number | null = isSerious
    ? ((live.liveEquity - live.liveStartBalance) / live.liveStartBalance) * 100
    : null;

  // Live trades per day: estimate from timestamp range
  const liveTradesPerDay = computeLiveTradesPerDay(live.liveTrades);

  // ── Gaps ─────────────────────────────────────────────────────────────────
  const winRateGap     = liveWinRate     !== null ? liveWinRate - btWinRate         : null;
  const expectancyRGap = liveExpectancyR !== null ? liveExpectancyR - btExpectancyR : null;

  // ── Overall flag ─────────────────────────────────────────────────────────
  const overallFlag = computeOverallFlag(
    hasEnoughLive, isSerious, winRateGap, expectancyRGap, btWinRate, btExpectancyR,
  );

  // ── Regime breakdown ──────────────────────────────────────────────────────
  const byRegime = computeRegimeConsistency(btResult.byRegime, live.liveTrades, isSerious);

  // ── Exit distribution ─────────────────────────────────────────────────────
  const byExit = computeExitConsistency(btResult.trades, live.liveTrades, hasEnoughLive);

  // ── Trade frequency flag ──────────────────────────────────────────────────
  const tradeFrequencyFlag = computeFrequencyFlag(btTradesPerDay, liveTradesPerDay);

  // ── Summary sentence ─────────────────────────────────────────────────────
  const summary = buildSummary(overallFlag, live.totalLiveTrades, isSerious, winRateGap, expectancyRGap);

  return {
    generatedAt:       now,
    flag:              overallFlag,
    summary,
    liveTrades:        live.totalLiveTrades,
    backtestTrades:    btResult.summary.totalTrades,
    backtestWindow:    btWindow,
    hasEnoughLiveData: hasEnoughLive,
    btWinRate,         liveWinRate,
    btExpectancyR,     liveExpectancyR,
    btMaxDrawdown,     liveMaxDrawdown,
    btTotalReturn,     liveTotalReturn,
    winRateGap,        expectancyRGap,
    byRegime,
    byExit,
    btTradesPerDay:   Number(btTradesPerDay.toFixed(2)),
    liveTradesPerDay: liveTradesPerDay !== null ? Number(liveTradesPerDay.toFixed(2)) : null,
    tradeFrequencyFlag,
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function computeOverallFlag(
  hasEnoughLive: boolean,
  isSerious:     boolean,
  winRateGap:    number | null,
  expRGap:       number | null,
  btWinRate:     number,
  btExpR:        number,
): ValidationFlag {
  if (!hasEnoughLive) return 'INSUFFICIENT_LIVE_DATA';
  if (!isSerious)     return 'PARTIAL';

  // Check overfit: backtest much better than live
  if (winRateGap !== null && winRateGap < -(btWinRate * OVERFIT_GAP)) return 'OVERFIT_RISK';
  if (expRGap    !== null && btExpR > 0 && expRGap < -(btExpR * OVERFIT_GAP)) return 'OVERFIT_RISK';

  // Check underperforming
  if (winRateGap !== null && winRateGap < -(btWinRate * CONSISTENT_BAND)) return 'UNDERPERFORMING';
  if (expRGap    !== null && btExpR > 0 && expRGap < -(btExpR * CONSISTENT_BAND)) return 'UNDERPERFORMING';

  return 'CONSISTENT';
}

function computeRegimeConsistency(
  btByRegime: { regime: string; metrics: any }[],
  liveTrades: LiveTrade[],
  isSerious:  boolean,
): RegimeConsistency[] {
  return btByRegime.map(bt => {
    const btM = bt.metrics;
    // We don't have regime tags on live trades from the ledger — approximate as 'unknown'
    // If strategyId contains regime info, use that
    const regimeTrades = liveTrades.filter(t =>
      t.strategyId?.includes(bt.regime.toLowerCase()) ||
      t.strategyId?.includes(bt.regime === 'TREND' ? 'trend' : bt.regime === 'RANGE' ? 'range' : 'high'),
    );

    const livePnLs  = regimeTrades.filter(t => t.realizedPnL !== undefined).map(t => t.realizedPnL!);
    const liveWins  = livePnLs.filter(p => p > 0);

    const liveWR  = isSerious && livePnLs.length >= 5
      ? (liveWins.length / livePnLs.length) * 100
      : null;

    const winRateDelta = liveWR !== null ? liveWR - btM.winRate : null;

    const flag = computeRegimeFlag(winRateDelta, btM.winRate, regimeTrades.length, isSerious);

    return {
      regime:              bt.regime,
      btTradeCount:        btM.totalTrades,
      btWinRate:           btM.winRate,
      btExpectancyR:       btM.expectancyR,
      liveTradeCount:      regimeTrades.length,
      liveWinRate:         liveWR,
      liveExpectancyR:     null,  // insufficient granularity from ledger
      winRateDelta,
      expectancyRDelta:    null,
      flag,
    };
  });
}

function computeRegimeFlag(
  delta:       number | null,
  btWinRate:   number,
  liveCount:   number,
  isSerious:   boolean,
): ValidationFlag {
  if (!isSerious || liveCount < 5) return 'INSUFFICIENT_LIVE_DATA';
  if (delta === null) return 'PARTIAL';
  if (delta < -(btWinRate * OVERFIT_GAP))      return 'OVERFIT_RISK';
  if (delta < -(btWinRate * CONSISTENT_BAND))  return 'UNDERPERFORMING';
  return 'CONSISTENT';
}

function computeExitConsistency(
  btTrades:   any[],
  liveTrades: LiveTrade[],
  hasEnough:  boolean,
): ExitConsistency[] {
  const reasons = ['tp1', 'trailing', 'stopLoss', 'endOfData'];

  return reasons.map(reason => {
    const btCount   = btTrades.filter(t => t.exitReason === reason).length;
    const btPct     = btTrades.length > 0 ? (btCount / btTrades.length) * 100 : 0;

    const liveCount = liveTrades.filter(t =>
      t.reason === reason ||
      (reason === 'tp1'       && t.reason === 'takeProfit') ||
      (reason === 'trailing'  && t.reason === 'trailingStop') ||
      (reason === 'stopLoss'  && t.reason === 'stopLoss'),
    ).length;

    const livePct = hasEnough && liveTrades.length > 0
      ? (liveCount / liveTrades.length) * 100
      : null;

    const delta = livePct !== null ? Math.abs(livePct - btPct) : null;
    const flag: ValidationFlag = delta === null
      ? 'INSUFFICIENT_LIVE_DATA'
      : delta < btPct * CONSISTENT_BAND ? 'CONSISTENT' : 'UNDERPERFORMING';

    return { exitReason: reason, btPct, livePct, flag };
  });
}

function computeFrequencyFlag(
  btPerDay:   number,
  livePerDay: number | null,
): ValidationFlag {
  if (livePerDay === null || btPerDay === 0) return 'INSUFFICIENT_LIVE_DATA';
  const ratio = livePerDay / btPerDay;
  if (ratio < 0.3 || ratio > 3) return 'UNDERPERFORMING';
  return 'CONSISTENT';
}

function approximateMaxDrawdown(trades: LiveTrade[]): number {
  let equity = 10000;
  let peak   = equity;
  let maxDD  = 0;

  for (const t of trades) {
    if (t.realizedPnL !== undefined) {
      equity += t.realizedPnL;
      if (equity > peak) peak = equity;
      const dd = peak > 0 ? ((peak - equity) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    }
  }
  return Number(maxDD.toFixed(2));
}

function computeLiveTradesPerDay(trades: LiveTrade[]): number | null {
  if (trades.length < 2) return null;
  const sorted = [...trades].sort((a, b) =>
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const spanMs = new Date(sorted[sorted.length - 1].timestamp).getTime()
               - new Date(sorted[0].timestamp).getTime();
  const spanDays = spanMs / (1000 * 60 * 60 * 24);
  if (spanDays < 0.01) return null;
  return trades.length / spanDays;
}

function buildSummary(
  flag:        ValidationFlag,
  liveCount:   number,
  isSerious:   boolean,
  winRateGap:  number | null,
  expRGap:     number | null,
): string {
  switch (flag) {
    case 'NO_BACKTEST':
      return 'No backtest available. Run a backtest first.';
    case 'INSUFFICIENT_LIVE_DATA':
      return `Only ${liveCount} live trade(s) recorded. Need ≥${SERIOUS_LIVE_TRADES} for full validation.`;
    case 'PARTIAL':
      return `${liveCount} live trades — partial analysis only (need ≥${SERIOUS_LIVE_TRADES} for full comparison).`;
    case 'CONSISTENT':
      return `Live performance is consistent with backtest expectations (winRate gap: ${winRateGap?.toFixed(1) ?? 'n/a'}%, expectancyR gap: ${expRGap?.toFixed(3) ?? 'n/a'}).`;
    case 'UNDERPERFORMING':
      return `Live performance is below backtest expectations. WinRate gap: ${winRateGap?.toFixed(1) ?? 'n/a'}%, expectancyR gap: ${expRGap?.toFixed(3) ?? 'n/a'}. Investigate execution or regime mismatch.`;
    case 'OVERFIT_RISK':
      return `Large gap between backtest and live performance — possible overfitting. WinRate gap: ${winRateGap?.toFixed(1) ?? 'n/a'}%. Review parameter set and backtest window.`;
    default:
      return 'Validation complete.';
  }
}
