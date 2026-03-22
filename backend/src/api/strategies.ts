import { Router } from 'express';
const router = Router();

// Phase 3: active regime strategy status
router.get('/strategies/active', (_req, res) => {
  try {
    const { getLastAnalysis } = require('../intelligence/aiAnalysisPipeline');
    const analysis = getLastAnalysis();
    if (!analysis) {
      return res.json({ active: null, reason: 'No AI analysis committed yet' });
    }
    const strategyMap: Record<string, string> = {
      TREND:     'regime-trend (trendStrategy — EMA20 pullback)',
      RANGE:     'regime-range (rangeStrategy — RSI mean-reversion)',
      HIGH_RISK: 'none (highRiskStrategy — no-trade)',
    };
    res.json({
      active:     strategyMap[analysis.regime] ?? 'unknown',
      regime:     analysis.regime,
      bias:       analysis.bias,
      confidence: analysis.confidence,
      leverage:   analysis.leverageBand,
      timestamp:  analysis.timestamp,
    });
  } catch (e) {
    res.status(500).json({ error: 'Active strategy status unavailable' });
  }
});

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
