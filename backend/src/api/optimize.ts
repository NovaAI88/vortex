// VORTEX — Optimization API (Phase 6)
//
// POST /api/optimize/run    → start optimization sweep with config
// GET  /api/optimize/status → current run status + progress
// GET  /api/optimize/results → ranked param grid results

import express from 'express';
import { startOptimization, getOptimizationState } from '../optimization/optimizationRunner';
import { OptimizationConfig } from '../optimization/optimizationTypes';
import { STANDARD_DIMENSIONS } from '../optimization/paramGrid';

const router = express.Router();

// ─── POST /api/optimize/run ───────────────────────────────────────────────

router.post('/run', async (req, res) => {
  try {
    const body = req.body ?? {};

    const config: OptimizationConfig = {
      symbol:               'BTCUSDT',
      interval:             ['1m', '5m', '15m'].includes(body.interval) ? body.interval : '1m',
      limit:                clampInt(body.limit, 200, 1000, 500),
      trainFraction:        clampFloat(body.trainFraction, 0.5, 0.9, 0.7),
      initialCapital:       clampFloat(body.initialCapital, 100, 1_000_000, 10000),
      positionSizePct:      clampFloat(body.positionSizePct, 0.01, 1, 0.1),
      exitMode:             ['atr', 'fixed'].includes(body.exitMode) ? body.exitMode : 'atr',
      sweepMode:            ['one-at-a-time', 'cross'].includes(body.sweepMode) ? body.sweepMode : 'one-at-a-time',
      maxCombos:            clampInt(body.maxCombos, 1, 200, 200),
      dimensions:           [],  // always use STANDARD_DIMENSIONS
      minTrades:            clampInt(body.minTrades, 1, 100, 5),
      seriousCandidateMin:  clampInt(body.seriousCandidateMin, 5, 500, 20),
      maxDrawdownFilter:    clampFloat(body.maxDrawdownFilter, 5, 100, 30),
    };

    const runId = await startOptimization(config);
    res.json({
      runId,
      status:  'started',
      message: 'Optimization started. Poll GET /api/optimize/status for progress.',
      config,
    });
  } catch (err: any) {
    if (err?.message?.includes('already running')) {
      return res.status(409).json({ error: err.message });
    }
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

// ─── GET /api/optimize/status ─────────────────────────────────────────────

router.get('/status', (_req, res) => {
  const s = getOptimizationState();
  res.json({
    status:        s.status,
    progress:      s.progress,
    totalRuns:     s.totalRuns,
    completedRuns: s.completedRuns,
    runId:         s.runId ?? null,
    error:         s.error ?? null,
    durationMs:    s.durationMs ?? null,
  });
});

// ─── GET /api/optimize/results ────────────────────────────────────────────

router.get('/results', (_req, res) => {
  const s = getOptimizationState();

  if (s.status === 'idle') {
    return res.status(404).json({ error: 'No optimization has been run yet' });
  }
  if (s.status === 'running') {
    return res.status(202).json({
      status:        'running',
      progress:      s.progress,
      completedRuns: s.completedRuns,
      totalRuns:     s.totalRuns,
    });
  }
  if (s.status === 'error') {
    return res.status(500).json({ status: 'error', error: s.error });
  }

  const ranked = s.ranked ?? [];

  // Separate serious vs visible (low-trade-count) candidates
  const serious   = ranked.filter(r => r.result.isSerious && !r.result.isFiltered);
  const visible   = ranked.filter(r => !r.result.isSerious && !r.result.isFiltered);
  const filtered  = ranked.filter(r => r.result.isFiltered);

  res.json({
    status:     'done',
    runId:      s.runId,
    durationMs: s.durationMs,
    config:     s.config,
    summary: {
      totalRuns:       ranked.length,
      seriousCandidates: serious.length,
      visibleCandidates: visible.length,
      filteredOut:     filtered.length,
    },
    top5:         serious.slice(0, 5),   // top serious candidates
    allRanked:    ranked,                // full ranked list
    dimensions:   STANDARD_DIMENSIONS.map(d => ({
      name:   d.name,
      values: d.values,
    })),
  });
});

export default router;

// ─── Helpers ──────────────────────────────────────────────────────────────

function clampInt(v: any, min: number, max: number, def: number): number {
  const n = parseInt(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function clampFloat(v: any, min: number, max: number, def: number): number {
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(min, Math.min(max, n));
}
