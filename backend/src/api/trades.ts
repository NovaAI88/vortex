import { Router } from 'express';
import { getRecentExecutions } from '../execution/executionLog';
const router = Router();

const FALLBACK_TRADES = [
  { timestamp: '2026-03-16T12:00:00.000Z', symbol: 'BTCUSDT', side: 'buy', qty: 0.098, price: 67085, variantId: 'v1', status: 'simulated', reason: 'fallback trade 1' },
  { timestamp: '2026-03-16T12:00:05.000Z', symbol: 'BTCUSDT', side: 'sell', qty: 0.25, price: 67086, variantId: 'v2', status: 'simulated', reason: 'fallback trade 2' },
  { timestamp: '2026-03-16T12:00:10.000Z', symbol: 'BTCUSDT', side: 'buy', qty: 0.11, price: 67087, variantId: 'v3', status: 'simulated', reason: 'fallback trade 3' },
];

// Correct real field mapping only
router.get('/trades', (_req, res) => {
  const recents = getRecentExecutions();

  if (!recents || recents.length === 0) {
    res.json(FALLBACK_TRADES.map(t => ({ ...t, source: 'fallback' })));
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
