import { Router } from 'express';
import { getOrderBook } from '../processing/state/orderBookState';
const router = Router();

router.get('/orderbook', (_req, res) => {
  const ob = getOrderBook();
  if (ob) {
    res.json({
      source: 'live',
      bids: ob.bids.map(b => [b.price, b.size]),
      asks: ob.asks.map(a => [a.price, a.size]),
      support: ob.support,
      resistance: ob.resistance,
      timestamp: ob.timestamp
    });
    return;
  }

  res.json({
    source: 'unavailable',
    bids: [],
    asks: [],
    support: null,
    resistance: null,
    timestamp: new Date().toISOString(),
  });
});

export default router;
