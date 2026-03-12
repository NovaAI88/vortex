import { Router } from 'express';
import { getRecentRisks } from '../risk/state/riskState';
const router = Router();

router.get('/risk', (_req, res) => {
  res.json(getRecentRisks());
});

export default router;
