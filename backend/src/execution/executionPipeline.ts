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
    // Position sizing for PAPER_TRADING (adaptive risk-based dynamic)
    if (getEngineMode() === EngineMode.PAPER_TRADING) {
      const BASE_RISK = Number(process.env.AETHER_RISK_PER_TRADE_BASE ?? process.env.AETHER_RISK_PER_TRADE ?? 0.0075);
      const MIN_RISK = Number(process.env.AETHER_RISK_PER_TRADE_MIN ?? 0.005);
      const MAX_RISK = Number(process.env.AETHER_RISK_PER_TRADE_MAX ?? 0.01);
      const STOP_DISTANCE_PCT = Math.max(0.001, Math.min(0.2, Number(process.env.AETHER_STOP_DISTANCE_PCT ?? 0.005)));
      const MIN_TRADE_QTY = Math.max(0.000001, Number(process.env.AETHER_MIN_TRADE_QTY ?? 0.000001));
      const MIN_TRADE_NOTIONAL = Math.max(0, Number(process.env.AETHER_MIN_TRADE_NOTIONAL ?? 10));
      const MAX_SYMBOL_EXPOSURE_PCT = Math.max(0.01, Math.min(1, Number(process.env.AETHER_MAX_SYMBOL_EXPOSURE_PCT ?? 0.25)));
      const MAX_PORTFOLIO_EXPOSURE_PCT = Math.max(0.01, Math.min(1, Number(process.env.AETHER_MAX_PORTFOLIO_EXPOSURE_PCT ?? 0.9)));

      const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

      let equity = 10000;
      let maxPositionSizePercent = 10;
      let positions: any[] = [];
      let portfolioPnl = 0;
      let totalExposure = 0;

      try {
        const { getPortfolio } = require('../portfolio/state/portfolioLedger');
        const portfolio = getPortfolio();
        if (portfolio && typeof portfolio.equity === 'number' && isFinite(portfolio.equity) && portfolio.equity > 0) {
          equity = portfolio.equity;
        }
        positions = Array.isArray(portfolio?.positions) ? portfolio.positions.filter(Boolean) : [];
        portfolioPnl = Number.isFinite(Number(portfolio?.pnl)) ? Number(portfolio.pnl) : 0;
        totalExposure = Number.isFinite(Number(portfolio?.positionsValue)) ? Number(portfolio.positionsValue) : 0;
      } catch (e) {}

      try {
        const { getStatus } = require('../risk/globalRiskController');
        const riskStatus = getStatus();
        if (riskStatus && typeof riskStatus.maxPositionSizePercent === 'number' && isFinite(riskStatus.maxPositionSizePercent) && riskStatus.maxPositionSizePercent > 0) {
          maxPositionSizePercent = riskStatus.maxPositionSizePercent;
        }
      } catch (e) {}

      const adaptiveRisk = (() => {
        const safeBase = clamp(Number.isFinite(BASE_RISK) ? BASE_RISK : 0.0075, 0.001, 0.05);
        const safeMin = clamp(Number.isFinite(MIN_RISK) ? MIN_RISK : 0.005, 0.001, 0.05);
        const safeMax = clamp(Number.isFinite(MAX_RISK) ? MAX_RISK : 0.01, 0.001, 0.05);
        if (!Number.isFinite(equity) || equity <= 0) return clamp(safeBase, safeMin, safeMax);

        const pnlRatio = portfolioPnl / equity;
        const performanceAdj = clamp(pnlRatio * 0.5, -0.5, 0.5); // bounded performance scaler
        const risk = safeBase * (1 + performanceAdj);
        return clamp(risk, Math.min(safeMin, safeMax), Math.max(safeMin, safeMax));
      })();

      if (!request.price || request.price <= 0 || !isFinite(request.price)) {
        const result = {
          id: (Math.random() * 1e17).toString(36),
          executionRequestId: request.id,
          riskDecisionId: request.riskDecisionId,
          actionCandidateId: request.actionCandidateId,
          signalId: request.signalId,
          strategyId: request.strategyId,
          symbol: request.symbol,
          side: request.side,
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

      const stopLoss = Number((decision as any)?.stopLoss);
      const volatilityProxy = Number((decision as any)?.volatility ?? (decision as any)?.atr ?? (decision as any)?.volatilityProxy);

      let stopDistanceSource: 'stopLoss' | 'volatility' | 'fallbackPct' = 'fallbackPct';
      let stopDistance = request.price * STOP_DISTANCE_PCT;

      if (Number.isFinite(stopLoss) && stopLoss > 0) {
        const d = Math.abs(request.price - stopLoss);
        if (Number.isFinite(d) && d > 0) {
          stopDistance = d;
          stopDistanceSource = 'stopLoss';
        }
      } else if (Number.isFinite(volatilityProxy) && volatilityProxy > 0) {
        stopDistance = volatilityProxy;
        stopDistanceSource = 'volatility';
      }

      stopDistance = Math.max(stopDistance, request.price * 0.0005);

      const riskCapital = Math.max(equity * adaptiveRisk, 0);
      const qtyByRisk = stopDistance > 0 ? (riskCapital / stopDistance) : 0;

      const baseMaxNotional = Math.max(0, equity * (maxPositionSizePercent / 100));
      const symbolExposure = positions
        .filter((p: any) => p?.symbol === request.symbol)
        .reduce((sum: number, p: any) => sum + Math.abs((Number(p?.qty) || 0) * (Number(p?.markPrice ?? p?.avgEntry ?? 0))), 0);

      const symbolCap = Math.max(0, equity * MAX_SYMBOL_EXPOSURE_PCT - symbolExposure);
      const portfolioCap = Math.max(0, equity * MAX_PORTFOLIO_EXPOSURE_PCT - totalExposure);
      const adjustedMaxNotional = Math.max(0, Math.min(baseMaxNotional, symbolCap, portfolioCap));
      const qtyByMaxPosition = adjustedMaxNotional / request.price;

      const rawQty = Math.min(qtyByRisk, qtyByMaxPosition);
      const finalQty = Number.isFinite(rawQty) ? Number(rawQty.toFixed(6)) : 0;
      const tradeNotional = finalQty * request.price;

      let skipped = false;
      let skipReason: string | null = null;

      if (!Number.isFinite(finalQty) || finalQty <= 0) {
        skipped = true;
        skipReason = 'position size computed as non-positive';
      } else if (finalQty < MIN_TRADE_QTY) {
        skipped = true;
        skipReason = 'position size below minimum tradable threshold';
      } else if (tradeNotional < MIN_TRADE_NOTIONAL) {
        skipped = true;
        skipReason = 'position notional below minimum tradable threshold';
      }

      console.log('[TRACE execution.sizing]', {
        symbol: request.symbol,
        variantId: request.variantId,
        side: request.side,
        equity,
        baseRisk: BASE_RISK,
        adaptedRisk: adaptiveRisk,
        stopDistanceSource,
        stopDistance,
        qtyByRisk,
        qtyByMaxPosition,
        finalQty,
        skipped,
        skipReason,
      });

      if (skipped) {
        const result = {
          id: (Math.random() * 1e17).toString(36),
          executionRequestId: request.id,
          riskDecisionId: request.riskDecisionId,
          actionCandidateId: request.actionCandidateId,
          signalId: request.signalId,
          strategyId: request.strategyId,
          symbol: request.symbol,
          side: request.side,
          price: request.price,
          qty: finalQty,
          variantId: request.variantId,
          status: 'rejected',
          reason: skipReason || 'position sizing rejected trade',
          adapter: 'positionSizer',
          timestamp: new Date().toISOString(),
        };
        try {
          logExecution(result);
          const { appendAlert } = require('../alerts/alertStore');
          appendAlert({
            timestamp: result.timestamp,
            severity: 'warning',
            source: 'execution',
            message: result.reason,
          });
        } catch (e) {}
        publishExecutionResult(bus, result, 'execution', envelope.correlationId);
        processedRiskDecisionIds.add(decision.id);
        return;
      }

      request.qty = finalQty;
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
