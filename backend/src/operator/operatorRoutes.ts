import { Router } from 'express';
import { getOperatorStateHandler, pauseTradingHandler, startTradingHandler } from './operatorController';

const router = Router();

router.get('/operator/state', getOperatorStateHandler);
router.post('/operator/pause', pauseTradingHandler);
router.post('/operator/start', startTradingHandler);

export default router;
