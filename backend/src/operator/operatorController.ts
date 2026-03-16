import { Request, Response } from 'express';
import { getOperatorState, pauseTrading, startTrading } from './operatorState';

export function getOperatorStateHandler(_req: Request, res: Response) {
  res.json(getOperatorState());
}

export function pauseTradingHandler(_req: Request, res: Response) {
  res.json(pauseTrading());
}

export function startTradingHandler(_req: Request, res: Response) {
  res.json(startTrading());
}
