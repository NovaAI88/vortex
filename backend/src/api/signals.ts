import { Router } from 'express';
import { getRecentSignals } from '../intelligence/state/signalState';
const router = Router();

router.get('/signals', (_req, res) => {
  const signals = getRecentSignals();
  res.json(signals);
});

export default router;
