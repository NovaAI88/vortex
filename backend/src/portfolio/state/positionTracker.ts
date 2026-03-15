// In-memory position tracker
import { ExecutionResult } from '../../models/ExecutionResult';
import { PositionSnapshot } from '../../models/PositionSnapshot';

const positions = new Map<string, { qty: number; side: 'buy'|'sell'; lastId: string }>();
let lastSnapshot: PositionSnapshot|null = null;

export function updatePosition(executionResult: ExecutionResult): PositionSnapshot {
  const symbol = executionResult.symbol || 'BTCUSDT';
  let entry = positions.get(symbol);
  if (!entry) entry = { qty: 0, side: 'buy', lastId: '' };
  if (executionResult.status !== 'simulated') return null;
  if (!executionResult.qty || executionResult.qty <= 0) return null;
  if (executionResult.side === 'buy') entry.qty += executionResult.qty;
  if (executionResult.side === 'sell') entry.qty -= executionResult.qty;
  entry.side = executionResult.side;
  entry.lastId = executionResult.id;
  positions.set(symbol, entry);
  lastSnapshot = {
    id: (Math.random() * 1e17).toString(36),
    symbol,
    qty: entry.qty,
    side: entry.side,
    sourceExecutionResultId: executionResult.id,
    timestamp: new Date().toISOString(),
  };
  return lastSnapshot;
}

export function getLatestPositionSnapshot(): PositionSnapshot|null {
  return lastSnapshot;
}
