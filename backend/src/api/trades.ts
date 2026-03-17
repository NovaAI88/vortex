import { Router } from 'express';
import { getRecentExecutions } from '../execution/executionLog';
const router = Router();

router.get('/trades', (_req, res) => {
  const recents = getRecentExecutions();
  if (!recents || recents.length === 0) {
    res.json([]);
    return;
  }

  res.json(recents.map(exec => ({
    source: 'live',
    timestamp: exec.timestamp ?? null,
    symbol: exec.symbol ?? null,
    side: exec.side ?? null,
    qty: exec.qty ?? null,
    price: exec.price ?? null,
    variantId: exec.variantId ?? null,
    status: exec.status ?? null,
    reason: exec.reason ?? null
  })));
});

export default router;
