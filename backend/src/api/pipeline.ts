import { Router } from 'express';
import { getRecentSignals } from '../intelligence/state/signalState';
import { getRecentDecisions } from '../decision/state/decisionState';
import { getRecentRisks } from '../risk/state/riskState';
import { getRecentExecutions } from '../execution/executionLog';

const router = Router();

router.get('/pipeline/trace', (_req, res) => {
  try {
    const signals = getRecentSignals();
    const decisions = getRecentDecisions();
    const risks = getRecentRisks();
    const executions = getRecentExecutions();

    const traces = signals.slice(0, 30).map((s: any) => {
      const signalId = `${s?.timestamp}:${s?.source}:${s?.variantId || 'default'}`;
      const decision = decisions.find((d: any) => d?.signalId === signalId);
      const risk = risks.find((r: any) => r?.signalId === signalId);
      const execution = executions.find((e: any) => e?.signalId === signalId);

      let finalStatus = 'SIGNAL_EMITTED';
      if (decision) finalStatus = 'DECISION_CREATED';
      if (risk?.approved) finalStatus = 'DECISION_APPROVED';
      if (risk && !risk?.approved) finalStatus = `RISK_BLOCKED_${String(risk?.blockedBy || 'UNKNOWN').toUpperCase()}`;
      if (execution?.status === 'rejected') finalStatus = `EXECUTION_REJECTED_${String(execution?.reason || 'UNKNOWN').toUpperCase().replace(/\s+/g, '_')}`;
      if (execution?.status === 'simulated') finalStatus = 'EXECUTED_SIMULATED';

      return {
        signalId,
        timestamp: s?.timestamp,
        symbol: s?.symbol,
        strategyId: s?.strategyId || s?.source,
        variantId: s?.variantId || 'default',
        side: s?.signalType,
        confidence: s?.confidence,
        decision: decision ? { id: decision.id, side: decision.side } : null,
        risk: risk ? { approved: risk.approved, blockedBy: (risk as any).blockedBy || null, reason: risk.reason } : null,
        execution: execution ? { status: execution.status, reason: execution.reason, qty: execution.qty, price: execution.price } : null,
        finalStatus,
      };
    });

    res.json(traces);
  } catch {
    res.status(500).json({ error: 'Pipeline trace unavailable' });
  }
});

export default router;
