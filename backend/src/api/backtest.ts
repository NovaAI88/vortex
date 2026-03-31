// VORTEX — Backtest API (Phase 5)
//
// Routes:
//   POST /api/backtest/run     → start a backtest run with BacktestConfig
//   GET  /api/backtest/status  → current run status + progress
//   GET  /api/backtest/results → full BacktestResult (if done)
//
// The run is asynchronous. Poll /status until 'done' or 'error',
// then fetch /results.

import express from 'express';
import {
  startBacktest,
  getBacktestState,
  getBacktestResult,
  getBacktestPersistenceMeta,
} from '../backtest/backtestRunner';
import { BacktestConfig } from '../backtest/backtestTypes';
import { ParamSet, DEFAULT_PARAMS } from '../optimization/optimizationTypes';

const router = express.Router();

// ─── POST /api/backtest/run ───────────────────────────────────────────────

router.post('/run', async (req, res) => {
  try {
    const body = req.body ?? {};

    // Validate + extract config fields (all optional — runner applies defaults)
    const config: Partial<BacktestConfig> = {};

    if (body.interval !== undefined) {
      if (!['1m', '5m', '15m'].includes(body.interval)) {
        return res.status(400).json({ error: 'interval must be 1m, 5m, or 15m' });
      }
      config.interval = body.interval;
    }

    if (body.limit !== undefined) {
      const limit = Number(body.limit);
      if (!Number.isFinite(limit) || limit < 50 || limit > 1000) {
        return res.status(400).json({ error: 'limit must be 50–1000' });
      }
      config.limit = limit;
    }

    if (body.initialCapital !== undefined) {
      const ic = Number(body.initialCapital);
      if (!Number.isFinite(ic) || ic <= 0) {
        return res.status(400).json({ error: 'initialCapital must be a positive number' });
      }
      config.initialCapital = ic;
    }

    if (body.positionSizePct !== undefined) {
      const pct = Number(body.positionSizePct);
      if (!Number.isFinite(pct) || pct <= 0 || pct > 1) {
        return res.status(400).json({ error: 'positionSizePct must be 0–1' });
      }
      config.positionSizePct = pct;
    }

    if (body.exitMode !== undefined) {
      if (!['atr', 'fixed', 'both'].includes(body.exitMode)) {
        return res.status(400).json({ error: 'exitMode must be atr, fixed, or both' });
      }
      config.exitMode = body.exitMode;
    }

    if (body.riskPerTrade !== undefined) {
      const risk = Number(body.riskPerTrade);
      if (!Number.isFinite(risk) || risk <= 0 || risk > 0.5) {
        return res.status(400).json({ error: 'riskPerTrade must be 0–0.5' });
      }
      config.riskPerTrade = risk;
    }

    if (body.strategyMode !== undefined) {
      if (!['both', 'range', 'trend'].includes(body.strategyMode)) {
        return res.status(400).json({ error: 'strategyMode must be both, range, or trend' });
      }
      config.strategyMode = body.strategyMode;
    }

    // Optional ParamSet override — deep-merged with DEFAULT_PARAMS so callers
    // only need to send the fields they want to change.
    let params: ParamSet = DEFAULT_PARAMS;
    if (body.params !== undefined && typeof body.params === 'object') {
      params = {
        ...DEFAULT_PARAMS,
        id: body.params.id ?? 'manual',
        exit:       { ...DEFAULT_PARAMS.exit,       ...(body.params.exit       ?? {}) },
        trend:      { ...DEFAULT_PARAMS.trend,      ...(body.params.trend      ?? {}) },
        range:      { ...DEFAULT_PARAMS.range,      ...(body.params.range      ?? {}) },
        confidence: { ...DEFAULT_PARAMS.confidence, ...(body.params.confidence ?? {}) },
      };
    }

    const runId = await startBacktest(config, params);

    res.json({
      runId,
      status: 'started',
      message: 'Backtest started. Poll GET /api/backtest/status for progress.',
    });

  } catch (err: any) {
    // startBacktest throws if already running
    if (err?.message?.includes('already running')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// ─── GET /api/backtest/status ─────────────────────────────────────────────

router.get('/status', (_req, res) => {
  const s = getBacktestState();
  const persistence = getBacktestPersistenceMeta();
  res.json({
    status:   s.status,
    progress: s.progress ?? null,
    error:    s.error    ?? null,
    persistence,
  });
});

// ─── GET /api/backtest/results ────────────────────────────────────────────

router.get('/results', (_req, res) => {
  const s = getBacktestState();

  if (s.status === 'idle') {
    return res.status(404).json({ error: 'No backtest has been run yet' });
  }

  if (s.status === 'running') {
    return res.status(202).json({
      status:   'running',
      progress: s.progress ?? 0,
      message:  'Backtest still in progress. Retry when status is done.',
    });
  }

  if (s.status === 'error') {
    return res.status(500).json({ status: 'error', error: s.error });
  }

  const result = getBacktestResult();
  if (!result) {
    return res.status(404).json({ error: 'No result available' });
  }

  res.json({ status: 'done', result });
});

export default router;
