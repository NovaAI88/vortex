import { Router } from 'express';
import { getRecentAlerts } from '../alerts/alertStore';
const router = Router();

router.get('/alerts', (_req, res) => {
  res.json(getRecentAlerts());
});

export default router;
