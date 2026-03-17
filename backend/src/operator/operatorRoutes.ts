import { Router } from 'express';
import {
  getOperatorStateHandler,
  pauseTradingHandler,
  startTradingHandler,
  overrideRiskHandler,
  clearOverrideRiskHandler,
} from './operatorController';

const router = Router();

router.get('/operator/state', getOperatorStateHandler);
router.post('/operator/pause', pauseTradingHandler);
router.post('/operator/start', startTradingHandler);
router.post('/operator/override-risk', overrideRiskHandler);
router.post('/operator/override-risk/clear', clearOverrideRiskHandler);

export default router;
