import { Router } from 'express';
import { getRecentDecisions } from '../decision/state/decisionState';
const router = Router();

router.get('/decisions', (_req, res) => {
  res.json(getRecentDecisions());
});

export default router;
