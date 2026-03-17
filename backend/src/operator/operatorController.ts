import { Request, Response } from 'express';
import { getOperatorState, pauseTrading, startTrading, setRiskOverride, clearRiskOverride } from './operatorState';
import { addRiskEvent } from '../risk/globalRiskController';

export function getOperatorStateHandler(_req: Request, res: Response) {
  res.json(getOperatorState());
}

export function pauseTradingHandler(_req: Request, res: Response) {
  const next = pauseTrading();
  addRiskEvent('operator_pause', 'operator paused trading');
  res.json(next);
}

export function startTradingHandler(_req: Request, res: Response) {
  const next = startTrading();
  addRiskEvent('operator_start', 'operator started trading');
  res.json(next);
}

export function overrideRiskHandler(req: Request, res: Response) {
  const minutes = Number(req?.body?.minutes ?? 15);
  const next = setRiskOverride(minutes);
  addRiskEvent('risk_override_enabled', `operator override ${Math.max(1, Math.min(240, minutes || 15))}m`);
  res.json(next);
}

export function clearOverrideRiskHandler(_req: Request, res: Response) {
  const next = clearRiskOverride();
  addRiskEvent('risk_override_cleared', 'operator cleared risk override');
  res.json(next);
}
