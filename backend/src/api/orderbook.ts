import { Router } from 'express';
import { getOrderBook } from '../processing/state/orderBookState';
const router = Router();

const FALLBACK_ORDERBOOK = {
  bids: [['67085.00', '0.80'], ['67080.50', '0.60']],
  asks: [['67086.50', '0.75'], ['67090.00', '1.10']],
  support: '67100.00',
  resistance: '67300.00',
};

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
    source: 'fallback',
    ...FALLBACK_ORDERBOOK,
    timestamp: new Date().toISOString(),
  });
});

export default router;
