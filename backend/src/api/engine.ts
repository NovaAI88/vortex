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

export default router;
