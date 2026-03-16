import { Router } from 'express';
import { getRecentMarketPrices } from '../market/marketPriceBuffer';
const router = Router();

const FALLBACK_PRICE_HISTORY = [
  { timestamp: '2026-03-16T12:00:00.000Z', price: 67040.0 },
  { timestamp: '2026-03-16T12:00:10.000Z', price: 67055.5 },
  { timestamp: '2026-03-16T12:00:20.000Z', price: 67062.1 },
  { timestamp: '2026-03-16T12:00:30.000Z', price: 67048.2 },
  { timestamp: '2026-03-16T12:00:40.000Z', price: 67071.6 },
  { timestamp: '2026-03-16T12:00:50.000Z', price: 67084.0 },
  { timestamp: '2026-03-16T12:01:00.000Z', price: 67079.3 },
  { timestamp: '2026-03-16T12:01:10.000Z', price: 67092.7 },
];

// GET /api/market/price-history
router.get('/market/price-history', (_req, res) => {
  const prices = getRecentMarketPrices();
  if (!prices || prices.length === 0) {
    res.json(FALLBACK_PRICE_HISTORY.map(p => ({ ...p, source: 'fallback' })));
    return;
  }
  res.json(prices.map(p => ({ ...p, source: 'live' })));
});

export default router;
