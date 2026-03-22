import express from 'express';
import apiApp from './api/index';

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3001", "http://localhost:3002"];
  if (origin && allowed.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use('/', apiApp);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'VORTEX backend' });
});

// --- Legacy /status endpoint for compatibility ---
app.get('/status', (_req, res) => {
  res.json({
    service: "VORTEX backend",
    status: "running",
    time: new Date().toISOString()
  });
});

// --- ENGINE RUNTIME BOOTSTRAP ---
import { EventBus } from './events/eventBus';
import { startIngestion } from './ingestion/index';
import { startProcessingPipeline } from './processing/processingPipeline';
import { startIntelligencePipeline } from './intelligence/intelligencePipeline';
import { startDecisionPipeline } from './decision/decisionPipeline';
import { startRiskPipeline } from './risk/riskPipeline';
import { startExecutionPipeline } from './execution/executionPipeline';
import { setEngineMode, EngineMode } from './execution/mode/executionMode';
import { loadDedupStore } from './decision/state/dedupStore';
import { startPositionMonitor } from './execution/positionMonitor';

// Load persisted state before starting pipelines
loadDedupStore();

const bus = new EventBus();
setEngineMode(EngineMode.PAPER_TRADING);
startIngestion(bus, true); // false = mock, true = live
console.log('[engine] PAPER TRADING MODE ACTIVE');
console.log('[engine] LIVE MARKET DATA MODE ACTIVE (Binance public)');
startProcessingPipeline(bus);
startIntelligencePipeline(bus);
startDecisionPipeline(bus);
startRiskPipeline(bus);
startExecutionPipeline(bus);
startPositionMonitor(bus);
console.log('[engine] Paper-trading runtime initialized (PAPER_TRADING mode enforced)');
// --- END ENGINE BOOTSTRAP ---

app.listen(port, () => {
  console.log(`VORTEX backend running on port ${port}`);
});
