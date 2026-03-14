import { Router } from 'express';
import { getRecentExecutions } from '../execution/executionLog';
const router = Router();

// Correct real field mapping only
router.get('/trades', (_req, res) => {
  const recents = getRecentExecutions();
  res.json(recents.map(exec => ({
    timestamp: exec.timestamp ?? null,
    symbol: exec.symbol ?? null, // real symbol only
    side: exec.side ?? null,     // real side only
    qty: exec.qty ?? null,       // real qty only
    price: exec.price ?? null,   // real price only
    variantId: exec.variantId ?? null,
    status: exec.status ?? null,
    reason: exec.reason ?? null
  })));
});

export default router;
