// VORTEX — AI Analysis API (Phase 2)
// GET /api/ai/analysis — returns the last committed regime analysis

import { Router } from 'express';
import { getLastAnalysis } from '../intelligence/aiAnalysisPipeline';

const router = Router();

router.get('/ai/analysis', (_req, res) => {
  try {
    const analysis = getLastAnalysis();
    if (!analysis) {
      return res.status(200).json({
        available: false,
        message:  'AI analysis not yet computed — indicators still warming up',
      });
    }
    res.json({ available: true, ...analysis });
  } catch (e) {
    res.status(500).json({ error: 'AI analysis unavailable', detail: String(e) });
  }
});

export default router;
