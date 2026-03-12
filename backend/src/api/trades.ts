import { Router } from 'express';
import { getRecentExecutions } from '../execution/executionLog';
const router = Router();

router.get('/trades', (_req, res) => {
  const recents = getRecentExecutions();
  res.json(recents.map(exec => ({
    side: exec.side||'buy',
    price: exec.symbol || 'BTCUSDT',
    size: exec.qty || '1',
    time: exec.timestamp
  })));
});

export default router;
