// VORTEX — AI Analysis Engine (Phase 2)
//
// Pure, deterministic regime classification and confidence scoring.
// Read-only: no imports from execution, risk, operator, or portfolio modules.
//
// Inputs:  FeatureSnapshot (from featurePipeline.getSnapshot())
//          current price and newsRiskFlag (from ProcessedMarketState)
// Outputs: AIAnalysis object
//
// Classification priority (evaluated in order):
//   1. HIGH_RISK  — news flag, extreme RSI, volatility spike
//   2. TREND      — EMA stack aligned + ADX > threshold
//   3. RANGE      — ADX weak + RSI neutral + price in cluster
//   4. HIGH_RISK  — fallback when signals conflict badly
//
// AI boundary: this module MUST NOT import from:
//   execution/, risk/, operator/, portfolio/
// See architecture/02_AI_BOUNDARY.md

import { FeatureSnapshot } from '../processing/featurePipeline';

// ─── Public interface ──────────────────────────────────────────────────────

export type Regime      = 'TREND' | 'RANGE' | 'HIGH_RISK';
export type Bias        = 'LONG' | 'SHORT' | 'NEUTRAL';
export type LeverageBand = 'LOW' | 'MEDIUM' | 'HIGH';

export interface AIAnalysis {
  timestamp:        string;
  regime:           Regime;
  bias:             Bias;
  confidence:       number;       // 0–1 composite
  regimeConfidence: number;       // 0–1 how certain regime call is
  volatilityLevel:  number;       // 0–1 (from snapshot, or 0.5 if null)
  leverageBand:     LeverageBand;
  rationale:        string[];
  indicatorsWarm:   boolean;
}

// ─── Thresholds ────────────────────────────────────────────────────────────

const ADX_TREND_THRESHOLD = 25;
const ADX_RANGE_THRESHOLD = 20;
const RSI_OVERBOUGHT      = 80;
const RSI_OVERSOLD        = 20;
const RSI_UPPER_NEUTRAL   = 60;
const RSI_LOWER_NEUTRAL   = 40;
const RSI_BULL            = 50;
const VOL_SPIKE_THRESHOLD = 0.7;  // volatilityLevel above this = HIGH_RISK

// ─── Classification helpers ────────────────────────────────────────────────

function classifyRegime(
  snap: FeatureSnapshot,
  price: number,
  newsRiskFlag: boolean,
): { regime: Regime; regimeConfidence: number; rationale: string[] } {
  const rationale: string[] = [];

  const ema20  = snap.ema20;
  const ema50  = snap.ema50;
  const ema200 = snap.ema200;
  const atr14  = snap.atr14;
  const rsi14  = snap.rsi14;
  const adx14  = snap.adx14;
  const vol    = snap.volatilityLevel ?? 0.5;

  // ── HIGH_RISK checks (highest priority) ──────────────────────────────

  if (newsRiskFlag) {
    rationale.push('News risk flag active — major news event detected');
    return { regime: 'HIGH_RISK', regimeConfidence: 0.9, rationale };
  }

  if (vol >= VOL_SPIKE_THRESHOLD) {
    rationale.push(`Volatility spike: level=${vol.toFixed(3)} exceeds threshold ${VOL_SPIKE_THRESHOLD}`);
    return { regime: 'HIGH_RISK', regimeConfidence: Math.min(0.5 + vol * 0.5, 1), rationale };
  }

  if (rsi14 !== null && (rsi14 > RSI_OVERBOUGHT || rsi14 < RSI_OVERSOLD)) {
    rationale.push(`RSI extreme: ${rsi14.toFixed(1)} (overbought >80 or oversold <20)`);
    return { regime: 'HIGH_RISK', regimeConfidence: 0.75, rationale };
  }

  // ── Need at least EMA20 and ADX for TREND/RANGE ──────────────────────

  if (ema20 === null || adx14 === null) {
    rationale.push('Insufficient indicators for TREND/RANGE — defaulting to HIGH_RISK');
    return { regime: 'HIGH_RISK', regimeConfidence: 0.5, rationale };
  }

  // ── TREND detection ───────────────────────────────────────────────────

  if (adx14 >= ADX_TREND_THRESHOLD) {
    const emaStackBull  = ema50 !== null && ema200 !== null && ema20 > ema50 && ema50 > ema200;
    const emaStackBear  = ema50 !== null && ema200 !== null && ema20 < ema50 && ema50 < ema200;
    const partialBull   = ema50 !== null && ema20 > ema50; // EMA200 not warm yet
    const partialBear   = ema50 !== null && ema20 < ema50;

    if (emaStackBull || (!ema200 && partialBull)) {
      const strength = Math.min((adx14 - ADX_TREND_THRESHOLD) / 25, 1); // 0 at ADX25, 1 at ADX50
      rationale.push(`Uptrend: EMA stack bullish, ADX=${adx14.toFixed(1)}`);
      return { regime: 'TREND', regimeConfidence: 0.5 + strength * 0.5, rationale };
    }
    if (emaStackBear || (!ema200 && partialBear)) {
      const strength = Math.min((adx14 - ADX_TREND_THRESHOLD) / 25, 1);
      rationale.push(`Downtrend: EMA stack bearish, ADX=${adx14.toFixed(1)}`);
      return { regime: 'TREND', regimeConfidence: 0.5 + strength * 0.5, rationale };
    }
    // ADX strong but EMA stack not aligned — directional conflict
    rationale.push(`ADX strong (${adx14.toFixed(1)}) but EMA stack not aligned — HIGH_RISK`);
    return { regime: 'HIGH_RISK', regimeConfidence: 0.6, rationale };
  }

  // ── RANGE detection ───────────────────────────────────────────────────

  if (adx14 < ADX_RANGE_THRESHOLD) {
    const rsiNeutral = rsi14 !== null && rsi14 >= RSI_LOWER_NEUTRAL && rsi14 <= RSI_UPPER_NEUTRAL;
    const nearEmaCluster = ema50 !== null
      ? Math.abs(price - ema50) / price < 0.005  // within 0.5% of EMA50
      : Math.abs(price - ema20) / price < 0.005;

    const rangeStrength = (rsiNeutral ? 0.3 : 0) + (nearEmaCluster ? 0.3 : 0);
    const regimeConf = 0.4 + rangeStrength;

    if (rsiNeutral) rationale.push(`RSI neutral: ${rsi14!.toFixed(1)} (40–60 range)`);
    if (nearEmaCluster) rationale.push('Price near EMA cluster (< 0.5% distance)');
    rationale.push(`ADX weak: ${adx14.toFixed(1)} (below ${ADX_RANGE_THRESHOLD})`);

    return { regime: 'RANGE', regimeConfidence: Math.min(regimeConf, 0.85), rationale };
  }

  // ── Borderline ADX (20–25) — mild trend or late range ─────────────────

  rationale.push(`ADX borderline: ${adx14.toFixed(1)} (${ADX_RANGE_THRESHOLD}–${ADX_TREND_THRESHOLD})`);
  return { regime: 'RANGE', regimeConfidence: 0.4, rationale };
}

function classifyBias(
  snap: FeatureSnapshot,
  price: number,
  regime: Regime,
): Bias {
  if (regime === 'HIGH_RISK') return 'NEUTRAL';

  const ema200 = snap.ema200 ?? snap.ema50 ?? snap.ema20; // best available
  const rsi14  = snap.rsi14;

  if (ema200 === null) return 'NEUTRAL';

  const aboveEma = price > ema200;
  const rsiBull  = rsi14 !== null && rsi14 > RSI_BULL;
  const rsiBear  = rsi14 !== null && rsi14 < RSI_BULL;

  if (aboveEma && rsiBull)  return 'LONG';
  if (!aboveEma && rsiBear) return 'SHORT';
  return 'NEUTRAL'; // conflicting signals
}

function computeConfidence(
  snap: FeatureSnapshot,
  price: number,
  regime: Regime,
  bias: Bias,
): number {
  if (regime === 'HIGH_RISK') return 0;

  const adx14  = snap.adx14  ?? 0;
  const rsi14  = snap.rsi14  ?? 50;
  const ema20  = snap.ema20  ?? price;
  const ema200 = snap.ema200 ?? price;
  const vol    = snap.volatilityLevel ?? 0.5;

  // Component 1: ADX strength (0–1 as ADX goes from threshold to 50)
  const adxScore = regime === 'TREND'
    ? Math.min(Math.max((adx14 - ADX_TREND_THRESHOLD) / 25, 0), 1)
    : Math.min(Math.max((ADX_RANGE_THRESHOLD - adx14) / ADX_RANGE_THRESHOLD, 0), 1);

  // Component 2: EMA separation (distance of EMA20 from EMA200 as % of price)
  const emaSep = Math.min(Math.abs(ema20 - ema200) / price / 0.02, 1); // 2% = full score

  // Component 3: RSI alignment with bias
  const rsiAlignment = bias === 'LONG'  ? Math.min((rsi14 - RSI_BULL) / RSI_BULL, 1)
    : bias === 'SHORT' ? Math.min((RSI_BULL - rsi14) / RSI_BULL, 1)
    : 0; // NEUTRAL contributes nothing
  const rsiScore = Math.max(rsiAlignment, 0);

  // Component 4: volatility stability (low vol = high confidence in signal)
  const volScore = Math.max(1 - vol, 0);

  // Weighted composite
  const score = (adxScore * 0.35) + (emaSep * 0.25) + (rsiScore * 0.20) + (volScore * 0.20);
  return Number(Math.min(score, 0.95).toFixed(4)); // cap at 0.95 — no perfect signal
}

function computeLeverageBand(confidence: number, regime: Regime): LeverageBand {
  if (regime === 'HIGH_RISK' || confidence < 0.5) return 'LOW';
  if (confidence >= 0.75 && regime === 'TREND')   return 'HIGH';
  return 'MEDIUM';
}

// ─── Public API ────────────────────────────────────────────────────────────

export function analyzeMarket(
  snap: FeatureSnapshot,
  price: number,
  newsRiskFlag: boolean,
): AIAnalysis {
  const timestamp = new Date().toISOString();

  // Hard gate: no analysis until indicators are warm
  if (!snap.indicatorsWarm) {
    return {
      timestamp,
      regime:           'HIGH_RISK',
      bias:             'NEUTRAL',
      confidence:       0,
      regimeConfidence: 0,
      volatilityLevel:  0,
      leverageBand:     'LOW',
      rationale:        ['Indicators not yet warm — no trades'],
      indicatorsWarm:   false,
    };
  }

  const vol = snap.volatilityLevel ?? 0.5;
  const { regime, regimeConfidence, rationale } = classifyRegime(snap, price, newsRiskFlag);
  const bias       = classifyBias(snap, price, regime);
  const confidence = computeConfidence(snap, price, regime, bias);
  const leverageBand = computeLeverageBand(confidence, regime);

  if (bias !== 'NEUTRAL') rationale.push(`Bias: ${bias} (price vs EMA200 + RSI)`);
  rationale.push(`Confidence: ${(confidence * 100).toFixed(1)}% | Leverage: ${leverageBand}`);

  return {
    timestamp,
    regime,
    bias,
    confidence,
    regimeConfidence,
    volatilityLevel: vol,
    leverageBand,
    rationale,
    indicatorsWarm: true,
  };
}
