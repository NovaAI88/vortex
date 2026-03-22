import express from 'express';
import { getLatestPositionSnapshot } from '../portfolio/state/positionTracker';
import { getPortfolio } from '../portfolio/state/portfolioLedger';
import orderbookRouter from './orderbook';
import tradesRouter from './trades';
import signalsRouter from './signals';
import decisionsRouter from './decisions';
import riskRouter from './risk';
import engineRouter from './engine';
import portfolioRouter from './portfolio';
import alertsRouter from './alerts';
import operatorRouter from '../operator/operatorRoutes';
import runtimeRouter from './runtime';
import pipelineRouter from './pipeline';
const app = express();
app.use(express.json());

app.get('/api/ping', (req, res) => res.status(200).send('pong'));
app.get('/api/status', (req, res) => res.status(200).json({status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), build: process.env.BUILD_HASH || 'dev'}));
app.get('/api/position', (req, res) => {
  const snap = getLatestPositionSnapshot();
  if (snap) res.json(snap);
  else res.status(404).json({error: 'No position snapshot available'});
});
app.get('/api/portfolio', (req, res) => {
  const portfolio = getPortfolio();
  if (portfolio && portfolio.equity > 0) res.json(portfolio);
  else res.status(404).json({error: 'No portfolio snapshot available'});
});

app.use('/api', orderbookRouter);
app.use('/api', tradesRouter);
app.use('/api', signalsRouter);
app.use('/api', decisionsRouter);
app.use('/api', riskRouter);
app.use('/api', engineRouter);
app.use('/api', portfolioRouter);
app.use('/api', alertsRouter);
app.use('/api', operatorRouter);
app.use('/api', runtimeRouter);
app.use('/api', pipelineRouter);
import strategiesRouter from './strategies';
app.use('/api', strategiesRouter);

import marketRouter from './market';
app.use('/api', marketRouter);

import backtestRouter from './backtest';
app.use('/api/backtest', backtestRouter);  // Phase 5 — POST /run, GET /status, GET /results

import manualRouter from './manual';
app.use('/api', manualRouter);

import systemRouter from './system';
app.use('/api', systemRouter);

import aiAnalysisRouter from './aiAnalysis';
app.use('/api', aiAnalysisRouter);

export default app;
