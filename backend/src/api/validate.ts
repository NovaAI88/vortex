// VORTEX — Validation API (Phase 6)
//
// GET /api/validate/report → full validation report comparing backtest vs live

import express from 'express';
import { generateValidationReport } from '../validation/backtestValidator';

const router = express.Router();

router.get('/report', (_req, res) => {
  try {
    const report = generateValidationReport();
    res.json({ report });
  } catch (err: any) {
    res.status(500).json({ error: String(err?.message ?? err) });
  }
});

export default router;
