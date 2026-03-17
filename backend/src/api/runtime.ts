import { Router } from 'express';
import { getOperatorState, isRiskOverrideActive } from '../operator/operatorState';
import { getStatus as getRiskStatus } from '../risk/globalRiskController';

const router = Router();

router.get('/runtime/state', (_req, res) => {
  try {
    const operator = getOperatorState() as any;
    const risk = getRiskStatus() as any;

    let runtimeState: 'LIVE' | 'PAUSED' | 'RISK_BLOCKED' | 'IDLE' = 'LIVE';
    if (operator?.tradingEnabled === false) runtimeState = 'PAUSED';
    else if ((risk && risk.tradingAllowed === false) && !isRiskOverrideActive()) runtimeState = 'RISK_BLOCKED';
    else if (!risk) runtimeState = 'IDLE';

    res.json({
      runtimeState,
      operatorTradingEnabled: !!operator?.tradingEnabled,
      riskTradingAllowed: !!risk?.tradingAllowed,
      riskOverrideActive: isRiskOverrideActive(),
      activeBlockReason: risk?.activeBlockReason || null,
      killSwitch: !!risk?.killSwitch,
      engineMode: 'paper',
      updatedAt: new Date().toISOString(),
      operator,
      risk,
    });
  } catch {
    res.status(500).json({ error: 'Runtime state unavailable' });
  }
});

export default router;
