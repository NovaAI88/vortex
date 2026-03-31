import express from 'express';
import apiApp from './api/index';

const app = express();
const port = process.env.PORT || 3000;

app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3002",
    "http://localhost:8080",
    "http://127.0.0.1:8080"
  ];
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
import { startCandleAggregator } from './ingestion/candles/candleAggregator';
import { seedHistoricalCandles } from './ingestion/candles/candleSeeder';
import { startFeaturePipeline } from './processing/featurePipeline';
import { startNewsRiskMonitor } from './processing/newsRiskMonitor';
import { startAIAnalysisPipeline } from './intelligence/aiAnalysisPipeline';
import { startAIResearchPipeline } from './intelligence/aiResearchPipeline';
import { startRegimeStrategyRouter } from './intelligence/regimeStrategyRouter';
import { logger } from './utils/logger';

// Load persisted state before starting pipelines
loadDedupStore();

const bus = new EventBus();
setEngineMode(EngineMode.PAPER_TRADING);
startCandleAggregator(bus);

// Seed historical candles before starting pipelines so indicators are warm from tick 1.
// Non-blocking: failure logs a warning but does not prevent startup.
seedHistoricalCandles().then(() => {
  startFeaturePipeline(bus);
  startIngestion(bus, true); // false = mock, true = live
  logger.info('engine', 'PAPER_TRADING mode active — live Binance market data enabled');
  startProcessingPipeline(bus);
  startIntelligencePipeline(bus);  // gated OFF by default — regime router is sole signal producer
  startAIAnalysisPipeline(bus);    // must start before regime router (provides AI_ANALYSIS events)
  startAIResearchPipeline(bus);    // consumes AI_ANALYSIS + PROCESSING_STATE, publishes structured AI_RESEARCH
  startRegimeStrategyRouter(bus);  // Phase 3: sole signal producer
  startDecisionPipeline(bus);
  startRiskPipeline(bus);
  startExecutionPipeline(bus);
  startPositionMonitor(bus);
  startNewsRiskMonitor();
  logger.info('engine', 'All pipelines started — runtime ready', { mode: 'PAPER_TRADING' });
}).catch(e => {
  // Should never reach here — seedHistoricalCandles() catches internally — but belt + braces.
  logger.error('engine', 'Unexpected seed error — starting without history', { err: String(e) });
  startFeaturePipeline(bus);
  startIngestion(bus, true);
  logger.info('engine', 'PAPER_TRADING mode active — live Binance market data enabled');
  startProcessingPipeline(bus);
  startIntelligencePipeline(bus);  // gated OFF by default — regime router is sole signal producer
  startAIAnalysisPipeline(bus);    // must start before regime router
  startAIResearchPipeline(bus);    // consumes AI_ANALYSIS + PROCESSING_STATE
  startRegimeStrategyRouter(bus);  // Phase 3: sole signal producer
  startDecisionPipeline(bus);
  startRiskPipeline(bus);
  startExecutionPipeline(bus);
  startPositionMonitor(bus);
  startNewsRiskMonitor();
  logger.info('engine', 'All pipelines started — runtime ready (no seed history)', { mode: 'PAPER_TRADING' });
});
// --- END ENGINE BOOTSTRAP ---

app.listen(port, () => {
  logger.info('server', `VORTEX backend running on port ${port}`);
});
