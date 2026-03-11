// In-memory position tracker (single-threaded, deterministic)
import { ExecutionResult } from '../../models/ExecutionResult';
import { PositionSnapshot } from '../../models/PositionSnapshot';

const positions = new Map<string, { qty: number; side: 'buy'|'sell'; lastId: string }>();

export function updatePosition(executionResult: ExecutionResult): PositionSnapshot {
  // Update logic: increment for 'buy', decrement for 'sell' (MVP only)
  const symbol = executionResult.symbol || 'BTCUSDT';
  let entry = positions.get(symbol);
  if (!entry) entry = { qty: 0, side: 'buy', lastId: '' };
  if (executionResult.status !== 'simulated') return null;
  if (executionResult.side === 'buy') entry.qty += 1;
  if (executionResult.side === 'sell') entry.qty -= 1;
  entry.side = executionResult.side;
  entry.lastId = executionResult.id;
  positions.set(symbol, entry);
  return {
    id: (Math.random() * 1e17).toString(36),
    symbol,
    qty: entry.qty,
    side: entry.side,
    sourceExecutionResultId: executionResult.id,
    timestamp: new Date().toISOString(),
  };
}
