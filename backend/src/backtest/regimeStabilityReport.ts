// VORTEX — Regime Stability Report (Phase 7A)
//
// Scans a replay state series to measure how stable regime classification is:
//
//   - Episode durations (how many candles each regime classification persisted)
//   - Switch frequency (regime changes per 100 candles)
//   - Regime distribution (% of candles in each regime)
//   - Edge-entry exposure (% of possible entry candles within first N candles of each episode)
//
// Input: replay states from buildReplayStates() with withExtensions flag.
// Uses the same analyzeMarket() function the simulator uses — guarantees consistency.
//
// No simulation. No trades. Pure replay-state analysis.

import { ProcessedMarketState } from '../models/ProcessedMarketState';
import { analyzeMarket }         from '../intelligence/aiAnalysisEngine';

// ─── Output types ─────────────────────────────────────────────────────────

export interface RegimeEpisode {
  regime:      string;
  startIndex:  number;
  endIndex:    number;    // inclusive
  duration:    number;    // candles
  startTime:   string;
  endTime:     string;
}

export interface RegimeStats {
  regime:         string;
  episodeCount:   number;
  totalCandles:   number;
  pctOfSeries:    number;    // %
  avgDuration:    number;    // candles
  minDuration:    number;
  maxDuration:    number;
  shortEpisodes:  number;    // episodes shorter than SHORT_EPISODE_THRESHOLD
  shortEpisodePct: number;   // % of this regime's episodes that were short
}

export interface RegimeStabilityReport {
  totalCandles:         number;
  warmCandles:          number;    // candles where indicatorsWarm = true
  totalEpisodes:        number;
  switchesPerHundred:   number;    // regime changes per 100 warm candles
  avgEpisodeDuration:   number;    // candles
  byRegime:             RegimeStats[];
  episodes:             RegimeEpisode[];  // full episode list (oldest first)
  edgeExposurePct:      number;    // % of warm candles that are within first 5 of any episode
  mostVolatileWindow:   string;    // time range with highest switch frequency (informational)
}

// ─── Constants ────────────────────────────────────────────────────────────

const SHORT_EPISODE_THRESHOLD = 5;  // episodes shorter than this are "short" (fragile)
const EDGE_CANDLES = 5;             // first N candles of any episode = edge exposure

// ─── Public API ───────────────────────────────────────────────────────────

export function buildRegimeStabilityReport(
  states: ProcessedMarketState[],
): RegimeStabilityReport {
  // ── Step 1: classify every warm candle ──────────────────────────────────
  interface ClassifiedCandle {
    index:   number;
    regime:  string;
    time:    string;
    confidence: number;
    regimeConfidence: number;
  }

  const classified: ClassifiedCandle[] = [];

  for (let i = 0; i < states.length; i++) {
    const state = states[i];
    if (!state.indicatorsWarm) continue;

    const snap = stateToFeatureSnapshot(state);
    const analysis = analyzeMarket(snap, state.price, state.newsRiskFlag ?? false);

    classified.push({
      index:            i,
      regime:           analysis.regime,
      time:             state.timestamp,
      confidence:       analysis.confidence,
      regimeConfidence: analysis.regimeConfidence,
    });
  }

  const warmCandles = classified.length;

  // ── Step 2: build episode list ───────────────────────────────────────────
  const episodes: RegimeEpisode[] = [];

  if (classified.length > 0) {
    let episodeStart = classified[0];
    let episodeEnd   = classified[0];

    for (let j = 1; j < classified.length; j++) {
      const c = classified[j];
      if (c.regime !== episodeEnd.regime) {
        // Close previous episode
        episodes.push({
          regime:     episodeEnd.regime,
          startIndex: episodeStart.index,
          endIndex:   episodeEnd.index,
          duration:   episodeEnd.index - episodeStart.index + 1,
          startTime:  episodeStart.time,
          endTime:    episodeEnd.time,
        });
        episodeStart = c;
      }
      episodeEnd = c;
    }
    // Close final episode
    episodes.push({
      regime:     episodeEnd.regime,
      startIndex: episodeStart.index,
      endIndex:   episodeEnd.index,
      duration:   episodeEnd.index - episodeStart.index + 1,
      startTime:  episodeStart.time,
      endTime:    episodeEnd.time,
    });
  }

  // ── Step 3: per-regime stats ─────────────────────────────────────────────
  const regimeNames = ['TREND', 'RANGE', 'HIGH_RISK'];
  const byRegime: RegimeStats[] = regimeNames.map(regime => {
    const eps = episodes.filter(e => e.regime === regime);
    if (eps.length === 0) {
      return {
        regime, episodeCount: 0, totalCandles: 0, pctOfSeries: 0,
        avgDuration: 0, minDuration: 0, maxDuration: 0,
        shortEpisodes: 0, shortEpisodePct: 0,
      };
    }
    const durations   = eps.map(e => e.duration);
    const totalCdls   = durations.reduce((s, d) => s + d, 0);
    const shortEps    = eps.filter(e => e.duration < SHORT_EPISODE_THRESHOLD);

    return {
      regime,
      episodeCount:    eps.length,
      totalCandles:    totalCdls,
      pctOfSeries:     warmCandles > 0 ? Number(((totalCdls / warmCandles) * 100).toFixed(1)) : 0,
      avgDuration:     Number((durations.reduce((s, d) => s + d, 0) / eps.length).toFixed(1)),
      minDuration:     Math.min(...durations),
      maxDuration:     Math.max(...durations),
      shortEpisodes:   shortEps.length,
      shortEpisodePct: Number(((shortEps.length / eps.length) * 100).toFixed(1)),
    };
  });

  // ── Step 4: edge exposure % ──────────────────────────────────────────────
  // How many warm candles are within the first EDGE_CANDLES of any episode?
  const edgeIndexSet = new Set<number>();
  for (const ep of episodes) {
    const edgeEnd = Math.min(ep.startIndex + EDGE_CANDLES - 1, ep.endIndex);
    for (let idx = ep.startIndex; idx <= edgeEnd; idx++) {
      edgeIndexSet.add(idx);
    }
  }
  // Only count warm candles in edge set
  const warmIndexSet = new Set(classified.map(c => c.index));
  const edgeWarmCount = [...edgeIndexSet].filter(idx => warmIndexSet.has(idx)).length;
  const edgeExposurePct = warmCandles > 0
    ? Number(((edgeWarmCount / warmCandles) * 100).toFixed(1))
    : 0;

  // ── Step 5: switch frequency ─────────────────────────────────────────────
  const totalSwitches = Math.max(0, episodes.length - 1);
  const switchesPerHundred = warmCandles > 0
    ? Number(((totalSwitches / warmCandles) * 100).toFixed(2))
    : 0;

  const avgEpisodeDuration = episodes.length > 0
    ? Number((episodes.reduce((s, e) => s + e.duration, 0) / episodes.length).toFixed(1))
    : 0;

  // ── Step 6: most volatile window (highest switch density in any 50-candle slice) ──
  let mostVolatileWindow = 'n/a';
  if (states.length >= 50) {
    let maxSwitches = 0;
    let maxStart    = 0;
    const WINDOW    = 50;

    for (let wi = 0; wi <= states.length - WINDOW; wi++) {
      const windowEps = episodes.filter(e =>
        e.startIndex >= wi && e.startIndex < wi + WINDOW,
      );
      if (windowEps.length > maxSwitches) {
        maxSwitches = windowEps.length;
        maxStart    = wi;
      }
    }

    if (maxSwitches > 0) {
      const ws = states[maxStart];
      const we = states[Math.min(maxStart + WINDOW - 1, states.length - 1)];
      mostVolatileWindow = `${ws?.timestamp?.slice(0, 16) ?? '?'} → ${we?.timestamp?.slice(0, 16) ?? '?'} (${maxSwitches} episodes in ${WINDOW} candles)`;
    }
  }

  return {
    totalCandles:       states.length,
    warmCandles,
    totalEpisodes:      episodes.length,
    switchesPerHundred,
    avgEpisodeDuration,
    byRegime,
    episodes,
    edgeExposurePct,
    mostVolatileWindow,
  };
}

// ─── Feature snapshot bridge (mirrors backtestSimulator) ─────────────────

function stateToFeatureSnapshot(state: ProcessedMarketState) {
  return {
    timestamp:       state.timestamp,
    candleCount:     0,
    indicatorsWarm:  state.indicatorsWarm ?? false,
    ema20:           state.ema20  ?? null,
    ema50:           state.ema50  ?? null,
    ema200:          state.ema200 ?? null,
    atr14:           state.atr14  ?? null,
    rsi14:           state.rsi14  ?? null,
    adx14:           state.adx14  ?? null,
    plusDI:          null,
    minusDI:         null,
    volatilityLevel: state.volatilityLevel ?? null,
    lastClose:       state.price,
  };
}
