import { Router } from 'express';
import {
  getActiveSignalTracks,
  getCompletedSignalTracks,
  getSignalMetrics,
} from '../performance/signalOutcomeTracker';

const router = Router();

router.get('/performance/signal-metrics', (_req, res) => {
  const metrics = getSignalMetrics();
  res.json(metrics);
});

router.get('/performance/signal-tracks', (_req, res) => {
  const active = getActiveSignalTracks();
  const completed = getCompletedSignalTracks();
  res.json({ active, completed });
});

export default router;
