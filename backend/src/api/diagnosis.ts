// VORTEX — Diagnosis API (Phase 7A)
//
// Routes:
//   GET /api/diagnosis/entry-quality   → entry-quality bucketed report
//   GET /api/diagnosis/regime-stability → regime episode analysis
//
// Both endpoints are synchronous (pure analysis of stored backtest result).
// They require a completed backtest (POST /api/backtest/run + status=done).
//
// The entry-quality endpoint re-runs the simulation with diagnostic extensions
// enabled so that ema20Slope, recentHigh/Low, and regimeAge fields are available
// on every trade. This is a lightweight re-run (~1s) of the last backtest config
// using already-fetched candles stored in the last BacktestResult.
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
import { analyzeEntryQuality } from '../backtest/entryQualityAnalyzer';
import { buildRegimeStabilityReport } from '../backtest/regimeStabilityReport';

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

export default router;
