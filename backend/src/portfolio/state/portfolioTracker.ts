// In-memory portfolio tracker (no balances, profit, or advanced metrics)
import { ExecutionResult } from '../../models/ExecutionResult';
import { PortfolioSnapshot } from '../../models/PortfolioSnapshot';

let equity = 100000; // fixed mock starting equity
let lastExecutionResultId = '';
let openPositions: string[] = [];

export function updatePortfolio(executionResult: ExecutionResult): PortfolioSnapshot {
  // MVP: simple lineage update, increment/decrement openPositions for symbol (no net calcs)
  lastExecutionResultId = executionResult.id;
  if (!openPositions.includes(executionResult.symbol)) openPositions.push(executionResult.symbol);
  return {
    id: (Math.random() * 1e17).toString(36),
    equity,
    openPositions,
    lastExecutionResultId,
    timestamp: new Date().toISOString(),
  };
}
