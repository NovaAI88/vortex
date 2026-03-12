import { Router } from 'express';
import { getOrderBook } from '../processing/state/orderBookState';
const router = Router();

router.get('/orderbook', (_req, res) => {
  const ob = getOrderBook();
  if (ob) res.json({
      bids: ob.bids.map(b=>[b.price,b.size]),
      asks: ob.asks.map(a=>[a.price,a.size]),
      support: ob.support,
      resistance: ob.resistance,
      timestamp: ob.timestamp
    });
  else res.status(503).json({ error: 'Orderbook unavailable' });
});

export default router;
