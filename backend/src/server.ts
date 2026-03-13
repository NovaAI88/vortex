import express from 'express';
import apiApp from './api/index';

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'http://localhost:3002');
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  next();
});

app.use('/', apiApp);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'AETHER backend (src)' });
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

const bus = new EventBus();
setEngineMode(EngineMode.PAPER_TRADING);
startIngestion(bus, false); // false = mock, true = live
startProcessingPipeline(bus);
startIntelligencePipeline(bus);
startDecisionPipeline(bus);
startRiskPipeline(bus);
startExecutionPipeline(bus);
console.log('[engine] Paper-trading runtime initialized (PAPER_TRADING mode enforced)');
// --- END ENGINE BOOTSTRAP ---

app.listen(port, () => {
  console.log(`AETHER backend (src) running on port ${port}`);
});
