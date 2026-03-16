// Execution Layer orchestration: only approved RiskDecision, dedup, mockExec, publish
import { EventBus } from '../events/eventBus';
import { EVENT_TOPICS } from '../events/topics';
import { mockExchangeAdapter } from './adapters/mockExchangeAdapter';
import { publishExecutionResult } from './publishers/executionResultPublisher';
import { ExecutionRequest } from '../models/ExecutionRequest';
import { getEngineMode, EngineMode } from './mode/executionMode';
import { getEnginePanelState } from '../state/engineState';
import { logExecution } from './executionLog';
import { recordExecution } from '../portfolio/state/portfolioLedger';

const processedRiskDecisionIds = new Set<string>();

export function startExecutionPipeline(bus: EventBus): void {
  bus.subscribe(EVENT_TOPICS.RISK_DECISION, envelope => {
    const decision = envelope.payload;

    console.log('[TRACE execution.input]', {
      approved: decision?.approved,
      symbol: decision?.symbol,
      side: decision?.side,
      variantId: decision?.variantId,
      price: decision?.price,
      signalId: decision?.signalId,
      actionCandidateId: decision?.actionCandidateId,
      riskDecisionId: decision?.id,
    });

    if (!decision.approved) return; // gate: only process approved
    if (processedRiskDecisionIds.has(decision.id)) return; // dedup gate
    const request: ExecutionRequest = {
      id: (Math.random() * 1e17).toString(36),
      riskDecisionId: decision.id,
      actionCandidateId: decision.actionCandidateId,
      signalId: decision.signalId,
      strategyId: decision.strategyId,
      symbol: decision.symbol || 'BTCUSDT', // fallback, required
      side: decision.side || 'buy', // fallback, required
      price: decision.price, // propagate price (ensure upstream includes price)
      variantId: decision.variantId, // propagate variantId
      producer: 'execution',
      timestamp: new Date().toISOString()
    };

    console.log('[TRACE execution.request]', {
      symbol: request.symbol,
      side: request.side,
      variantId: request.variantId,
      price: request.price,
      qty: request.qty,
      signalId: request.signalId,
      actionCandidateId: request.actionCandidateId,
      riskDecisionId: request.riskDecisionId,
      executionRequestId: request.id,
    });
    // Position sizing for PAPER_TRADING
    const riskFraction = 0.01;
    if (getEngineMode() === EngineMode.PAPER_TRADING) {
      let equity = 100000;
      let maxPositionSizePercent = 10;
      try {
        const { getPortfolio } = require('../portfolio/state/portfolioLedger');
        const portfolio = getPortfolio();
        if (portfolio && typeof portfolio.equity === 'number' && isFinite(portfolio.equity) && portfolio.equity > 0) {
          equity = portfolio.equity;
        }
      } catch (e) {}
      try {
        const { getStatus } = require('../risk/globalRiskController');
        const riskStatus = getStatus();
        if (riskStatus && typeof riskStatus.maxPositionSizePercent === 'number' && isFinite(riskStatus.maxPositionSizePercent) && riskStatus.maxPositionSizePercent > 0) {
          maxPositionSizePercent = riskStatus.maxPositionSizePercent;
        }
      } catch (e) {}
      if (!request.price || request.price <= 0) {
        const result = {
          id: (Math.random() * 1e17).toString(36),
          executionRequestId: request.id,
          riskDecisionId: request.riskDecisionId,
          actionCandidateId: request.actionCandidateId,
          signalId: request.signalId,
          strategyId: request.strategyId,
          price: request.price,
          qty: undefined,
          variantId: request.variantId,
          status: 'rejected',
          reason: 'Missing or invalid price for position sizing',
          adapter: 'positionSizer',
          timestamp: new Date().toISOString(),
        };
        try {
          logExecution(result);
          if (result.status === 'rejected' || result.status === 'failed') {
            const { appendAlert } = require('../alerts/alertStore');
            appendAlert({
              timestamp: result.timestamp,
              severity: 'error',
              source: 'execution',
              message: result.reason || 'Rejected execution',
            });
          }
        } catch (e) {}
        try {
          if (getEngineMode() === EngineMode.PAPER_TRADING) {
            recordExecution(result);
          }
        } catch(e) {}
        console.log('[TRACE execution.result]', {
          symbol: result.symbol,
          side: result.side,
          variantId: result.variantId,
          price: result.price,
          qty: result.qty,
          signalId: result.signalId,
          actionCandidateId: result.actionCandidateId,
          riskDecisionId: result.riskDecisionId,
          executionRequestId: result.executionRequestId,
          status: result.status,
          reason: result.reason,
        });
        publishExecutionResult(bus, result, 'execution', envelope.correlationId);
        processedRiskDecisionIds.add(decision.id);
        return;
      }
      const qtyByRiskFraction = (equity * riskFraction) / request.price;
      const qtyByMaxPosition = (equity * (maxPositionSizePercent / 100)) / request.price;
      request.qty = Math.min(qtyByRiskFraction, qtyByMaxPosition);
    }
    // Mode gating logic
    const mode = getEngineMode();
    if (mode === EngineMode.OFF || getEnginePanelState().paused) {
      // Drop execution request
      return;
    }
    let result = null;
    if (mode === EngineMode.PAPER_TRADING) {
      result = mockExchangeAdapter(request);
    } else if (mode === EngineMode.LIVE_TRADING) {
      // LIVE_TRADING not implemented yet
      result = {
        ...request,
        status: 'not_implemented',
        reason: 'LIVE_TRADING not implemented',
        adapter: 'none',
        timestamp: new Date().toISOString()
      };
    }
    if (result) {
      try {
        logExecution(result);
        if (result.status === 'failed' || result.status === 'rejected') {
          // Wire into alertStore
          const { appendAlert } = require('../alerts/alertStore');
          appendAlert({
            timestamp: result.timestamp,
            severity: 'error',
            source: 'execution',
            message: result.reason || 'Rejected/failure execution',
          });
        }
      } catch (e) {}
      // Stage 8: forward to portfolio ledger in PAPER_TRADING only
      try {
        if (getEngineMode() === EngineMode.PAPER_TRADING) {
          recordExecution(result);
        }
      } catch(e) {}
      console.log('[TRACE execution.result]', {
        symbol: result.symbol,
        side: result.side,
        variantId: result.variantId,
        price: result.price,
        qty: result.qty,
        signalId: result.signalId,
        actionCandidateId: result.actionCandidateId,
        riskDecisionId: result.riskDecisionId,
        executionRequestId: result.executionRequestId,
        status: result.status,
        reason: result.reason,
      });
      publishExecutionResult(bus, result, 'execution', envelope.correlationId);
    }
    processedRiskDecisionIds.add(decision.id);
  });
}
