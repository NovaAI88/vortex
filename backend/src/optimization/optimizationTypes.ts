// VORTEX — Optimization Types (Phase 6)

// ─── Tunable parameter overrides ──────────────────────────────────────────
// Passed into the simulator as overrides. Live system always uses defaults
// (these are never imported by live pipeline code).

export interface ExitParams {
  atrMultiplierTrend:    number;  // default 1.5
  atrMultiplierRange:    number;  // default 1.0
  atrMultiplierHighRisk: number;  // default 1.2
  tp1PartialPct:         number;  // fraction to close at TP1, default 0.5 (50%)
  fallbackStopPct:       number;  // default 0.005
}

export interface TrendParams {
  adxMin:      number;  // default 25
  pullbackMin: number;  // default 0.002 (Phase 7B: was 0.003)
  pullbackMax: number;  // default 0.035 (Phase 7B: was 0.025)
  rsiLongMax:  number;  // default 75
  rsiShortMin: number;  // default 25
  // Phase 7B: decoupled direction cap and bias inference
  pullbackDirectionTolerance: number;  // default 0.005 — how far above EMA20 a LONG is still valid
  allowStackInferredBias:     boolean; // default true — infer LONG/SHORT from EMA stack when bias=NEUTRAL
}

export interface RangeParams {
  rsiOversold:              number;          // default 35
  rsiOverbought:            number;          // default 65
  breakoutMargin:           number;          // default 0.015
  // Phase 7B: entry-quality filters (undefined = feature off / no gate applied)
  maxRegimeAge?:            number;          // suppress RANGE signal if age > this; default: undefined (no gate)
  rangeLocationThreshold?:  number;          // 0–1; longs blocked above, shorts below; default: undefined (no gate)
}

export interface ConfidenceParams {
  minConfidence: number;  // minimum analysis.confidence to emit a signal, default 0
}

export interface ParamSet {
  id:         string;
  exit:       ExitParams;
  trend:      TrendParams;
  range:      RangeParams;
  confidence: ConfidenceParams;
}

// Default parameter set — mirrors current hardcoded constants exactly.
// Phase 7B fields (maxRegimeAge, rangeLocationThreshold) are undefined by default,
// meaning the gates are OFF and existing behavior is preserved until explicitly swept.
export const DEFAULT_PARAMS: ParamSet = {
  id: 'default',
  exit: {
    atrMultiplierTrend:    1.5,
    atrMultiplierRange:    1.0,
    atrMultiplierHighRisk: 1.2,
    tp1PartialPct:         0.5,
    fallbackStopPct:       0.005,
  },
  trend: {
    adxMin:                    25,
    pullbackMin:               0.002,  // Phase 7B: was 0.003
    pullbackMax:               0.035,  // Phase 7B: was 0.025
    rsiLongMax:                75,
    rsiShortMin:               25,
    pullbackDirectionTolerance: 0.005, // Phase 7B: new — decoupled direction cap
    allowStackInferredBias:    true,   // Phase 7B: new — EMA stack bias inference
  },
  range: {
    rsiOversold:             35,
    rsiOverbought:           65,
    breakoutMargin:          0.015,
    maxRegimeAge:            20,          // Phase 7B default — gate active at 20 candles
    rangeLocationThreshold:  undefined,   // gate OFF by default (not yet activated)
  },
  confidence: {
    minConfidence: 0,
  },
};

// ─── Optimization config ───────────────────────────────────────────────────

export type SweepMode = 'one-at-a-time' | 'cross';

export interface SweepDimension {
  name:   string;      // human label, e.g. "atrMultiplierTrend"
  values: number[];    // candidate values to sweep
  // Setter: produces a new ParamSet with this dimension changed
  apply:  (base: ParamSet, value: number) => ParamSet;
}

export interface OptimizationConfig {
  // Data fetch
  symbol:   string;
  interval: '1m' | '5m' | '15m';
  limit:    number;   // total candles to fetch (train + validation)

  // Train / validation split
  // trainFraction = fraction of candles used for optimization (e.g. 0.7 = first 70%)
  // Remainder is held out for out-of-sample validation
  trainFraction: number;  // 0.5–0.9, default 0.7

  // Capital config (reuses BacktestConfig structure)
  initialCapital:  number;
  positionSizePct: number;
  exitMode:        'atr' | 'fixed';

  // Sweep config
  sweepMode:  SweepMode;   // default 'one-at-a-time'
  maxCombos:  number;      // hard cap, default 200
  dimensions: SweepDimension[];

  // Ranking constraints
  minTrades:             number;  // visibility threshold, default 5
  seriousCandidateMin:   number;  // required for top-ranked consideration, default 20
  maxDrawdownFilter:     number;  // % — discard results above this, default 30
}

// ─── Per-run result ────────────────────────────────────────────────────────

export interface SplitMetrics {
  totalTrades:  number;
  winRate:      number;
  expectancyR:  number;
  avgR:         number;
  sharpeRatio:  number;
  maxDrawdown:  number;
  totalReturn:  number;
  profitFactor: number;
}

export interface OptimizationRunResult {
  paramSet:       ParamSet;
  train:          SplitMetrics;   // in-sample (training window)
  validation:     SplitMetrics;   // out-of-sample (held-out window)
  combined:       SplitMetrics;   // full dataset
  candlesTrain:   number;
  candlesVal:     number;
  isSerious:      boolean;        // train.totalTrades >= seriousCandidateMin
  isFiltered:     boolean;        // true if excluded by drawdown/minTrades filter
}

// ─── Ranked output ─────────────────────────────────────────────────────────

export interface StabilityView {
  // For each ranked result, nearby param sets within ±1 step of each dimension
  nearbyCount:     number;   // how many neighbor param sets were found
  nearbyWinRate:   number;   // average winRate of neighbors
  nearbyExpR:      number;   // average expectancyR of neighbors
  stabilityScore:  number;   // 0–1: 1 = neighbors perform similarly to winner
  isFragile:       boolean;  // true if stabilityScore < 0.5
}

export interface RankedResult {
  rank:         number;
  result:       OptimizationRunResult;
  score:        number;   // composite ranking score
  stability:    StabilityView;
}

// ─── Optimization state ────────────────────────────────────────────────────

export type OptimizationStatus = 'idle' | 'running' | 'done' | 'error';

export interface OptimizationState {
  status:       OptimizationStatus;
  progress:     number;             // 0–100
  totalRuns:    number;
  completedRuns: number;
  error?:       string;
  ranked?:      RankedResult[];
  runId?:       string;
  config?:      OptimizationConfig;
  startTime?:   string;
  endTime?:     string;
  durationMs?:  number;
}
