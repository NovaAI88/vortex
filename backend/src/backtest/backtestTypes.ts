// VORTEX — Backtest Types (Phase 5)
//
// All shared types for the backtesting layer.
// No external dependencies — pure TypeScript interfaces.

// ─── Config ──────────────────────────────────────────────────────────────────

export type StrategyMode = 'both' | 'range' | 'trend';

export interface BacktestConfig {
  symbol:          string;         // 'BTCUSDT' (Phase 5 only)
  interval:        '1m' | '5m' | '15m';
  limit:           number;         // 200–1000 candles
  initialCapital:  number;         // default 10000
  positionSizePct: number;         // fraction of equity per trade, default 0.1
  exitMode:        'atr' | 'fixed' | 'both'; // 'both' = run atr + fixed, compare
  riskPerTrade:    number;         // fraction of capital risked, default 0.01
  strategyMode:    StrategyMode;   // 'both' (default) | 'range' | 'trend'
}

export const DEFAULT_CONFIG: BacktestConfig = {
  symbol:          'BTCUSDT',
  interval:        '1m',
  limit:           500,
  initialCapital:  10000,
  positionSizePct: 0.1,
  exitMode:        'atr',
  riskPerTrade:    0.01,
  strategyMode:    'both',
};

// ─── Trade record ─────────────────────────────────────────────────────────────

export type ExitReason = 'tp1' | 'trailing' | 'stopLoss' | 'endOfData';
export type ExitSource = 'atr' | 'fallback';

export interface BacktestTrade {
  // Entry
  entryIndex:   number;        // candle index in replay series
  entryTime:    string;        // ISO timestamp
  entryPrice:   number;
  side:         'buy' | 'sell';
  positionSize: number;        // USD notional
  qty:          number;        // units of asset

  // Exit levels (set at entry)
  stopLoss:     number;
  tp1:          number;        // partial close target (50%)
  tp2:          number;        // trailing stop activation
  rMultiple:    number;        // R in USD
  exitSource:   ExitSource;   // 'atr' or 'fallback'

  // Exit
  exitIndex:    number;
  exitTime:     string;
  exitPrice:    number;
  exitReason:   ExitReason;

  // Performance
  pnl:          number;        // total net USD PnL for this trade
  pnlPct:       number;        // PnL as % of position size
  realizedR:    number;        // PnL / rMultiple (R-multiples earned)
  isWin:        boolean;

  // Context
  regime:       string;        // 'TREND' | 'RANGE' | 'HIGH_RISK'
  strategyId:   string;        // 'regime-trend' | 'regime-range'
  variantId:    string;

  // Partial close tracking
  tp1Hit:       boolean;
  tp1PnL:       number;        // PnL from the 50% partial close
  remainderPnL: number;        // PnL from the remaining 50%

  // ── Phase 7A: Entry-quality diagnostic fields ─────────────────────────
  // All optional — populated by backtestSimulator when diagnostics enabled.
  // Null means the value was not computable at entry (e.g. insufficient history).

  regimeAge:              number | null; // candles current regime had been active at entry
  regimeConfidenceAtEntry: number | null; // AIAnalysis.regimeConfidence at entry (0–1)
  ema20SlopeAtEntry:      number | null; // EMA20[i] - EMA20[i-3], raw price units (+ = rising)
  atrNormDistAtEntry:     number | null; // |price - ema20| / atr14 at entry (pullback in ATR units)

  // RANGE-specific: where in the recent N-candle range the entry occurred.
  // = (price - recentLow) / (recentHigh - recentLow), 0 = at low, 1 = at high.
  // 0.5 = middle. For BUY signals: should be near 0 (near range low). For SELL: near 1.
  // Null for TREND trades (field is irrelevant).
  rangeLocationAtEntry:   number | null;

  // Quick-stop flag: was stop-loss hit within 3 candles of entry?
  quickStop:              boolean | null; // populated post-simulation by entryQualityAnalyzer
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

export interface StrategyMetrics {
  totalTrades:   number;
  wins:          number;
  losses:        number;
  winRate:       number;        // 0–100 %
  totalPnL:      number;
  avgWin:        number;
  avgLoss:       number;
  expectancy:    number;        // (winRate × avgWin) - (lossRate × avgLoss)
  profitFactor:  number;        // totalGross / |totalLoss|
  avgR:          number;        // average R-multiples per trade
  expectancyR:   number;        // (winRate × avgWinR) - (lossRate × avgLossR)
}

export interface RegimeBreakdown {
  regime:        string;
  metrics:       StrategyMetrics;
}

export interface StrategyBreakdown {
  strategyId:    string;
  metrics:       StrategyMetrics;
}

export interface ExitModeBreakdown {
  exitSource:    ExitSource;
  metrics:       StrategyMetrics;
}

export interface BacktestResult {
  runId:         string;
  config:        BacktestConfig;
  startTime:     string;
  endTime:       string;
  durationMs:    number;
  candlesUsed:   number;

  // Summary metrics
  initialCapital: number;
  finalEquity:    number;
  totalReturn:    number;        // %
  maxDrawdown:    number;        // % (peak-to-trough)
  sharpeRatio:    number;        // annualised (×√252 if daily, ×√(525600/interval_mins) otherwise)

  // Trade aggregate
  summary:        StrategyMetrics;
  equityCurve:    number[];      // equity at each candle
  trades:         BacktestTrade[];

  // Breakdowns
  byRegime:       RegimeBreakdown[];
  byStrategy:     StrategyBreakdown[];
  byExitMode:     ExitModeBreakdown[];
}

// ─── Runner state ─────────────────────────────────────────────────────────────

export type BacktestStatus = 'idle' | 'running' | 'done' | 'error';

export interface BacktestState {
  status:    BacktestStatus;
  progress?: number;           // 0–100
  error?:    string;
  result?:   BacktestResult;
}
