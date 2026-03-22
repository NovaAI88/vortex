// VORTEX — System Status API
//
// Single aggregated endpoint for operator visibility.
// Returns a complete system health snapshot in one call:
// - engine mode and runtime state
// - risk controller status (kill switch, drawdown, daily loss)
// - operator state (trading enabled, risk override)
// - position monitor status
// - circuit breaker state
// - portfolio summary
// - recent alerts
//
// This does NOT compute new state — it only reads from existing modules.
// Keep it as a pure aggregator.

import { Router } from 'express';
import { getEngineMode } from '../execution/mode/executionMode';
import { getStatus as getRiskStatus } from '../risk/globalRiskController';
import { getOperatorState, isRiskOverrideActive } from '../operator/operatorState';
import { getMonitorStatus } from '../execution/positionMonitor';
import { getCircuitBreakerState } from '../execution/circuitBreaker';
import { getPortfolio } from '../portfolio/state/portfolioLedger';
import { getRecentAlerts } from '../alerts/alertStore';
import { getLastAnalysis } from '../intelligence/aiAnalysisPipeline';

const router = Router();

router.get('/system/status', (_req, res) => {
  try {
    const engineMode = getEngineMode();
    const risk = getRiskStatus();
    const operator = getOperatorState() as any;
    const monitor = getMonitorStatus();
    const breaker = getCircuitBreakerState();
    const portfolio = getPortfolio();
    const alerts   = getRecentAlerts(20);
    const aiAnalysis = getLastAnalysis();

    // Derive top-level system health
    const tradingAllowed = risk.tradingAllowed && !!operator.tradingEnabled;
    let systemHealth: 'HEALTHY' | 'DEGRADED' | 'BLOCKED' | 'PAUSED';
    if (!operator.tradingEnabled) {
      systemHealth = 'PAUSED';
    } else if (!risk.tradingAllowed) {
      systemHealth = 'BLOCKED';
    } else if (breaker.consecutiveLosses >= Math.floor(breaker.maxConsecutiveLosses * 0.6)) {
      systemHealth = 'DEGRADED'; // approaching circuit breaker threshold
    } else {
      systemHealth = 'HEALTHY';
    }

    res.json({
      timestamp: new Date().toISOString(),
      systemHealth,
      tradingAllowed,

      engine: {
        mode: engineMode,
        uptime: Math.floor(process.uptime()),
      },

      risk: {
        killSwitch: risk.killSwitch,
        killSwitchReason: risk.killSwitchReason,
        tradingAllowed: risk.tradingAllowed,
        activeBlockReason: risk.activeBlockReason,
        drawdownPercent: risk.drawdownPercent,
        dailyLossPercent: risk.dailyLossPercent,
        currentEquity: risk.currentEquity,
        peakEquity: risk.peakEquity,
        baselineEquity: risk.baselineEquity,
        currentDailyPnl: risk.currentDailyPnl,
        riskOverrideActive: risk.riskOverrideActive,
        threshold: risk.threshold,
      },

      operator: {
        tradingEnabled: !!operator.tradingEnabled,
        riskOverrideActive: isRiskOverrideActive(),
        riskOverrideUntil: operator.riskOverrideUntil || null,
        lastAction: operator.lastAction || null,
        lastUpdated: operator.lastUpdated || null,
      },

      positionMonitor: {
        running: monitor.running,
        intervalMs: monitor.intervalMs,
        stalePriceMs: monitor.stalePriceMs,
        monitoredSymbol: monitor.monitoredSymbol,
        openPositionCount: monitor.openPositionCount,
      },

      circuitBreaker: {
        consecutiveLosses: breaker.consecutiveLosses,
        maxConsecutiveLosses: breaker.maxConsecutiveLosses,
        recentOutcomeCount: breaker.recentOutcomeCount,
        windowMs: breaker.windowMs,
        approachingThreshold: breaker.consecutiveLosses >= Math.floor(breaker.maxConsecutiveLosses * 0.6),
      },

      portfolio: {
        equity: portfolio.equity,
        balance: portfolio.balance,
        pnl: portfolio.pnl,
        positionsValue: portfolio.positionsValue,
        openPositionCount: portfolio.positions.length,
      },

      recentAlerts: alerts,

      aiAnalysis: aiAnalysis
        ? {
            regime:           aiAnalysis.regime,
            bias:             aiAnalysis.bias,
            confidence:       aiAnalysis.confidence,
            leverageBand:     aiAnalysis.leverageBand,
            volatilityLevel:  aiAnalysis.volatilityLevel,
            indicatorsWarm:   aiAnalysis.indicatorsWarm,
            timestamp:        aiAnalysis.timestamp,
          }
        : { available: false },
    });
  } catch (e) {
    res.status(500).json({ error: 'System status unavailable', detail: String(e) });
  }
});

export default router;
