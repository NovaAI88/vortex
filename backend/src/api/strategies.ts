import { Router } from 'express';
const router = Router();

router.get('/strategies/performance', (_req, res) => {
  try {
    const { getVariantPerformance } = require('../intelligence/performance/strategyPerformanceTracker');
    res.json(getVariantPerformance());
  } catch (e) {
    res.status(500).json({ error: 'Strategy performance unavailable' });
  }
});

router.get('/strategies/weights', (_req, res) => {
  try {
    const { getAllWeights } = require('../intelligence/weighting/strategyWeightEngine');
    res.json(getAllWeights());
  } catch (e) {
    res.status(500).json({ error: 'Strategy weights unavailable' });
  }
});

router.get('/strategies/evolution', (_req, res) => {
  try {
    const { momentumVariants } = require('../intelligence/evolution/strategyEvolver');
    const { getStrategyPerformance } = require('../intelligence/performance/strategyPerformanceTracker');
    const perf = getStrategyPerformance();
    const out = momentumVariants.map(({params}) => {
      const id = `momentum:${params.variantId}`;
      return {
        strategyId: 'momentum',
        variantId: params.variantId,
        params,
        performance: perf[id] || {}
      };
    });
    res.json(out);
  } catch (e) {
    res.status(500).json({ error: 'Strategy evolution unavailable' });
  }
});

export default router;
