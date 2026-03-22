// VORTEX — Validation Types (Phase 6)

export type ValidationFlag =
  | 'CONSISTENT'          // live within ±15% of backtest expectation
  | 'UNDERPERFORMING'     // live worse than backtest by >15%
  | 'OVERFIT_RISK'        // backtest too good relative to live (>30% gap)
  | 'INSUFFICIENT_LIVE_DATA'  // fewer than MIN_LIVE_TRADES for meaningful comparison
  | 'NO_BACKTEST'         // no completed backtest to compare against
  | 'PARTIAL';            // partial analysis only (some dimensions available)

export interface RegimeConsistency {
  regime:                string;
  // Backtest expectations
  btTradeCount:          number;
  btWinRate:             number;
  btExpectancyR:         number;
  // Live actuals
  liveTradeCount:        number;
  liveWinRate:           number | null;   // null if insufficient data
  liveExpectancyR:       number | null;
  // Delta
  winRateDelta:          number | null;   // live - backtest (%)
  expectancyRDelta:      number | null;
  flag:                  ValidationFlag;
}

export interface ExitConsistency {
  exitReason:            string;  // 'tp1' | 'trailing' | 'stopLoss' | 'endOfData'
  btPct:                 number;  // % of backtest trades that ended this way
  livePct:               number | null;
  flag:                  ValidationFlag;
}

export interface LiveStats {
  // Derived from executionLog + portfolioLedger
  totalLiveTrades:       number;
  liveTrades:            LiveTrade[];
  liveEquity:            number;
  liveRealizedPnL:       number;
  liveStartBalance:      number;
}

export interface LiveTrade {
  symbol:     string;
  side:       'buy' | 'sell';
  qty:        number;
  price:      number;
  variantId:  string | null;
  timestamp:  string;
  strategyId: string;
  realizedPnL?: number;
  reason?:    string;   // 'stopLoss' | 'takeProfit' | 'trailingStop' | 'manual' etc.
}

export interface ValidationReport {
  generatedAt:           string;
  flag:                  ValidationFlag;   // overall flag
  summary:               string;           // human-readable verdict

  // Data availability
  liveTrades:            number;
  backtestTrades:        number;
  backtestWindow:        string;           // e.g. "500 × 1m candles"
  hasEnoughLiveData:     boolean;          // >= MIN_LIVE_TRADES

  // Aggregate comparison
  btWinRate:             number;
  liveWinRate:           number | null;
  btExpectancyR:         number;
  liveExpectancyR:       number | null;
  btMaxDrawdown:         number;
  liveMaxDrawdown:       number | null;
  btTotalReturn:         number;
  liveTotalReturn:       number | null;
  winRateGap:            number | null;    // live - backtest (%)
  expectancyRGap:        number | null;

  // Regime-by-regime breakdown
  byRegime:              RegimeConsistency[];

  // Exit distribution comparison
  byExit:                ExitConsistency[];

  // Signal frequency
  btTradesPerDay:        number;
  liveTradesPerDay:      number | null;
  tradeFrequencyFlag:    ValidationFlag;
}
