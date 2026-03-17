import { Router } from 'express';
import { getRecentRisks } from '../risk/state/riskState';
import { resetRiskState, addRiskEvent, getStatus } from '../risk/globalRiskController';

const router = Router();

router.get('/risk', (_req, res) => {
  res.json(getRecentRisks());
});

router.get('/risk/status', (_req, res) => {
  try {
    res.json(getStatus());
  } catch {
    res.status(500).json({ error: 'Risk status unavailable' });
  }
});

router.post('/risk/reset', (_req, res) => {
  try {
    resetRiskState('api_reset');
    addRiskEvent('risk_reset_api', 'operator triggered risk reset via API');
    res.json({ ok: true, timestamp: new Date().toISOString(), status: getStatus() });
  } catch {
    res.status(500).json({ error: 'Risk reset failed' });
  }
});

export default router;
