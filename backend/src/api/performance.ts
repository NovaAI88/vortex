import { Router } from 'express';
import {
  getActiveSignalTracks,
  getCompletedSignalTracks,
  getSignalOutcomeStateFilePath,
  getSignalMetrics,
} from '../performance/signalOutcomeTracker';
import { buildProfitabilityLoopSnapshot } from '../performance/profitabilityLoop';
import {
  appendProfitabilityLoopSnapshot,
  getProfitabilityLoopStateFilePath,
  loadProfitabilityLoopHistory,
} from '../performance/profitabilityLoopStore';

const router = Router();

router.get('/performance/signal-metrics', (_req, res) => {
  const metrics = getSignalMetrics();
  res.json(metrics);
});

router.get('/performance/signal-tracks', (_req, res) => {
  const active = getActiveSignalTracks();
  const completed = getCompletedSignalTracks();
  res.json({
    active,
    completed,
    persistence: {
      stateFile: getSignalOutcomeStateFilePath(),
    },
  });
});

router.get('/performance/profitability-loop', (_req, res) => {
  const snapshot = buildProfitabilityLoopSnapshot();
  appendProfitabilityLoopSnapshot(snapshot);
  res.json({
    snapshot,
    persistence: {
      stateFile: getProfitabilityLoopStateFilePath(),
      historyCount: loadProfitabilityLoopHistory().length,
    },
  });
});

router.get('/performance/profitability-loop/history', (req, res) => {
  const parsedLimit = Number(req.query.limit);
  const limit = Number.isFinite(parsedLimit)
    ? Math.max(1, Math.min(500, Math.trunc(parsedLimit)))
    : 50;
  const history = loadProfitabilityLoopHistory();

  res.json({
    snapshots: history.slice(-limit).reverse(),
    count: history.length,
    limit,
    persistence: {
      stateFile: getProfitabilityLoopStateFilePath(),
    },
  });
});

export default router;
