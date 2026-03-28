// VORTEX — Diagnosis API (Phase 7A / Phase 7B)
//
// Routes:
//   GET /api/diagnosis/entry-quality      → entry-quality bucketed report
//   GET /api/diagnosis/regime-stability   → regime episode analysis
//   GET /api/diagnosis/trend-suppression  → TREND signal rejection breakdown (Phase 7B)
//
// All endpoints are synchronous (pure analysis of stored backtest result).
// They require a completed backtest (POST /api/backtest/run + status=done).
//
// The entry-quality endpoint re-runs the simulation with diagnostic extensions
// enabled so that ema20Slope, recentHigh/Low, and regimeAge fields are available
// on every trade. This is a lightweight re-run (~1s) of the last backtest config
// using already-fetched candles stored in the last BacktestResult.
//
// The trend-suppression endpoint does NOT re-simulate trades. It iterates all warm
// TREND-regime candles and records the rejection reason per candle — no I/O,
// deterministic, fast.
//
// ── Note on re-simulation ────────────────────────────────────────────────────
// The backtest runner stores the full BacktestResult including trade list and
// config. For the diagnosis endpoints, we re-fetch candles using the stored config
// and re-simulate with extensions enabled. This ensures diagnostic fields are
// always consistent with the stored result's parameters.

import express from 'express';
import { getBacktestResult } from '../backtest/backtestRunner';
import { fetchHistoricalCandles } from '../backtest/historicalDataFetcher';
import { buildReplayStates } from '../backtest/historicalFeatureBuilder';
import { runSimulation } from '../backtest/backtestSimulator';
import { analyzeEntryQuality, analyzeTrendSuppression } from '../backtest/entryQualityAnalyzer';
import { buildRegimeStabilityReport } from '../backtest/regimeStabilityReport';
import {
  getSignalMetrics,
  getActiveSignalTracks,
  getCompletedSignalTracks,
} from '../performance/signalOutcomeTracker';

const router = express.Router();

// ─── GET /api/diagnosis/entry-quality ────────────────────────────────────

router.get('/entry-quality', async (req, res) => {
  try {
    const btResult = getBacktestResult();
    if (!btResult) {
      return res.status(404).json({
        error: 'No completed backtest. Run POST /api/backtest/run first.',
      });
    }

    const config = btResult.config;

    // Re-fetch candles using stored config
    const candles = await fetchHistoricalCandles({
      symbol:   config.symbol,
      interval: config.interval,
      limit:    config.limit,
    });

    // Build replay states WITH diagnostic extensions
    const { states, extensions } = buildReplayStates(candles, true);

    // Re-simulate with diagnostic extensions threaded in
    const simResult = runSimulation(states, config, undefined, extensions);

    // Analyze entry quality
    const report = analyzeEntryQuality(simResult.trades, states.length);

    res.json({
      backtestConfig: {
        interval:    config.interval,
        limit:       config.limit,
        symbol:      config.symbol,
        exitMode:    config.exitMode,
      },
      totalCandlesReplayed: states.length,
      report,
    });

  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// ─── GET /api/diagnosis/regime-stability ─────────────────────────────────

router.get('/regime-stability', async (req, res) => {
  try {
    const btResult = getBacktestResult();
    if (!btResult) {
      return res.status(404).json({
        error: 'No completed backtest. Run POST /api/backtest/run first.',
      });
    }

    const config = btResult.config;

    // Re-fetch candles using stored config
    const candles = await fetchHistoricalCandles({
      symbol:   config.symbol,
      interval: config.interval,
      limit:    config.limit,
    });

    // Build replay states (extensions not needed here — stability is candle-level)
    const states = buildReplayStates(candles);

    // Build regime stability report
    const report = buildRegimeStabilityReport(states);

    // Drop the full episode list from the response if it's very large (keep last 100)
    const condensed = {
      ...report,
      episodes: report.episodes.slice(-100),
      episodesTotal: report.episodes.length,
      episodesNote: report.episodes.length > 100
        ? 'Showing last 100 episodes. Full list truncated.'
        : undefined,
    };

    res.json({
      backtestConfig: {
        interval:    config.interval,
        limit:       config.limit,
        symbol:      config.symbol,
      },
      report: condensed,
    });

  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// ─── GET /api/diagnosis/trend-suppression ─────────────────────────────────
// Phase 7B: definitive answer on why TREND signals are rare.
// Re-fetches candles, builds replay states, then re-runs TREND strategy
// diagnostically over every warm TREND-regime candle — recording the rejection
// reason at each. Returns blocker frequency ranking + near-miss analysis.

router.get('/trend-suppression', async (req, res) => {
  try {
    const btResult = getBacktestResult();
    if (!btResult) {
      return res.status(404).json({
        error: 'No completed backtest. Run POST /api/backtest/run first.',
      });
    }

    const config = btResult.config;

    // Re-fetch candles using stored config (same source of truth as other endpoints)
    const candles = await fetchHistoricalCandles({
      symbol:   config.symbol,
      interval: config.interval,
      limit:    config.limit,
    });

    // Build replay states (no extensions needed — suppression analysis uses indicators only)
    const states = buildReplayStates(candles);

    // Run TREND suppression diagnostic
    const report = analyzeTrendSuppression(states, 0);

    res.json({
      backtestConfig: {
        interval:    config.interval,
        limit:       config.limit,
        symbol:      config.symbol,
      },
      totalCandlesReplayed: states.length,
      report,
    });

  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// ─── GET /api/diagnosis/signal-performance ───────────────────────────────
// Returns unified signal tracking metrics, active/completed tracks, and a
// summary with dominant mode, best-performing mode, and a recommendation.

router.get('/signal-performance', (_req, res) => {
  try {
    const signalMetrics = getSignalMetrics();
    const activeTracks  = getActiveSignalTracks();
    const allCompleted  = getCompletedSignalTracks();
    const recentCompleted = allCompleted.slice(-10);

    const completed = signalMetrics.totals.completed;

    // ── Dominant trigger mode (most completed signals) ───────────────────
    const modes = ['rsi_extreme', 'context_confirmed', 'unknown'] as const;
    type KnownMode = typeof modes[number];

    let dominantTriggerMode: KnownMode | 'none' = 'none';
    if (completed > 0) {
      let maxCompleted = -1;
      for (const mode of modes) {
        if (signalMetrics.byTriggerMode[mode].completed > maxCompleted) {
          maxCompleted = signalMetrics.byTriggerMode[mode].completed;
          dominantTriggerMode = mode;
        }
      }
    }

    // ── Best-performing trigger mode (highest successRate) ───────────────
    let bestPerformingMode: KnownMode | 'none' = 'none';
    if (completed > 0) {
      let bestRate = -1;
      for (const mode of modes) {
        if (signalMetrics.byTriggerMode[mode].successRate > bestRate) {
          bestRate = signalMetrics.byTriggerMode[mode].successRate;
          bestPerformingMode = mode;
        }
      }
    }

    // ── Recommendation ────────────────────────────────────────────────────
    let recommendation: string;
    if (completed < 5) {
      recommendation = 'Not enough data yet — run paper trading session first';
    } else {
      const rsiRate = signalMetrics.byTriggerMode.rsi_extreme.successRate;
      const ctxRate = signalMetrics.byTriggerMode.context_confirmed.successRate;
      if (rsiRate - ctxRate > 0.10) {
        recommendation = 'Consider tightening context_confirmed thresholds';
      } else if (ctxRate - rsiRate > 0.10) {
        recommendation = 'context_confirmed outperforming — consider widening its entry zone';
      } else {
        recommendation = 'Performance balanced across trigger modes';
      }
    }

    res.json({
      signalMetrics,
      activeTracks,
      recentCompleted,
      summary: {
        dominantTriggerMode,
        bestPerformingMode,
        recommendation,
      },
    });

  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

export default router;
