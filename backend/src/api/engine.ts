import { Router } from 'express';
const router = Router();

router.get('/engine/status', (_req, res) => {
  res.json({
    time: new Date().toISOString(),
    status: 'ok',
    uptime: process.uptime(),
    pid: process.pid,
    memory: process.memoryUsage()
  });
});

// [STAGE 7] Execution mode
router.get('/engine/mode', (_req, res) => {
  try {
    const { getEngineMode } = require('../execution/mode/executionMode');
    res.json({ mode: getEngineMode() });
  } catch {
    res.status(500).json({ error: 'Engine mode unavailable' });
  }
});

// [STAGE 10] Global risk controller status
router.get('/engine/risk', (_req, res) => {
  try {
    const { getStatus } = require('../risk/globalRiskController');
    res.json(getStatus());
  } catch {
    res.status(500).json({ error: 'Global risk unavailable' });
  }
});

// Minimal GET /engine/state for dashboard
router.get('/engine/state', (_req, res) => {
  try {
    const { getEnginePanelState } = require('../state/engineState');
    res.json(getEnginePanelState());
  } catch {
    res.status(500).json({ error: 'Engine panel state unavailable' });
  }
});

// Pause/resume engine (POST)
router.post('/engine/pause', (_req, res) => {
  try {
    const { pauseEngine } = require('../state/engineState');
    pauseEngine();
    res.json({ paused: true });
  } catch {
    res.status(500).json({ error: 'Pause failed' });
  }
});

router.post('/engine/resume', (_req, res) => {
  try {
    const { resumeEngine } = require('../state/engineState');
    resumeEngine();
    res.json({ paused: false });
  } catch {
    res.status(500).json({ error: 'Resume failed' });
  }
});

export default router;
