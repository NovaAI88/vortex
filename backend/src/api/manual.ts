import { Router } from 'express';
import { getPortfolio, recordExecution } from '../portfolio/state/portfolioLedger';

const router = Router();

function toExec(params: { symbol: string; variantId?: string | null; side: 'buy' | 'sell'; qty: number; price: number; reason: string }) {
  const now = new Date().toISOString();
  return {
    id: `manual-${Math.random().toString(36).slice(2)}`,
    executionRequestId: `manual-req-${Math.random().toString(36).slice(2)}`,
    riskDecisionId: 'manual',
    actionCandidateId: 'manual',
    signalId: `manual:${params.reason}:${now}`,
    strategyId: 'manual',
    symbol: params.symbol,
    side: params.side,
    qty: params.qty,
    price: params.price,
    variantId: params.variantId || undefined,
    status: 'simulated' as const,
    reason: params.reason,
    adapter: 'manual-control',
    timestamp: now,
  };
}

function findPosition(symbol: string, variantId?: string | null) {
  const p = getPortfolio();
  const positions = Array.isArray(p?.positions) ? p.positions : [];
  return positions.find((x: any) => x?.symbol === symbol && (variantId ? (x?.variantId || null) === variantId : true));
}

router.post('/manual/close-position', (req, res) => {
  try {
    const { symbol = 'BTCUSDT', variantId = null } = req.body || {};
    const pos: any = findPosition(symbol, variantId);
    if (!pos || !pos.qty || pos.qty === 0) return res.status(400).json({ error: 'No open position to close' });

    const before = getPortfolio();
    const beforePnl = Number(before?.pnl || 0);

    const side: 'buy' | 'sell' = pos.qty > 0 ? 'sell' : 'buy';
    const qty = Math.abs(Number(pos.qty));
    const price = Number(pos.markPrice ?? pos.avgEntry ?? 0);
    if (!qty || !Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Invalid position data for close' });

    const exec = toExec({ symbol, variantId, side, qty, price, reason: 'manual_close_position' });
    recordExecution(exec as any);

    const after = getPortfolio();
    const afterPnl = Number(after?.pnl || 0);
    const realizedAmount = Number((afterPnl - beforePnl).toFixed(6));

    return res.json({ ok: true, action: 'close-position', execution: exec, realizedAmount, timestamp: new Date().toISOString(), portfolio: after });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'manual close failed' });
  }
});

router.post('/manual/take-profit', (req, res) => {
  try {
    const { symbol = 'BTCUSDT', variantId = null, fraction = 0.5 } = req.body || {};
    const pos: any = findPosition(symbol, variantId);
    if (!pos || !pos.qty || pos.qty === 0) return res.status(400).json({ error: 'No open position for take profit' });

    const before = getPortfolio();
    const beforePnl = Number(before?.pnl || 0);

    const side: 'buy' | 'sell' = pos.qty > 0 ? 'sell' : 'buy';
    const absQty = Math.abs(Number(pos.qty));
    const safeFraction = Math.max(0.01, Math.min(1, Number(fraction) || 0.5));
    const qty = Math.max(0.000001, Number((absQty * safeFraction).toFixed(6)));
    const price = Number(pos.markPrice ?? pos.avgEntry ?? 0);
    if (!qty || !Number.isFinite(price) || price <= 0) return res.status(400).json({ error: 'Invalid position data for take profit' });

    const exec = toExec({ symbol, variantId, side, qty, price, reason: 'manual_take_profit' });
    recordExecution(exec as any);

    const after = getPortfolio();
    const afterPnl = Number(after?.pnl || 0);
    const realizedAmount = Number((afterPnl - beforePnl).toFixed(6));

    return res.json({ ok: true, action: 'take-profit', fraction: safeFraction, execution: exec, realizedAmount, timestamp: new Date().toISOString(), portfolio: after });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'manual take-profit failed' });
  }
});

router.post('/manual/flatten-variant', (req, res) => {
  try {
    const { variantId = null } = req.body || {};
    if (!variantId) return res.status(400).json({ error: 'variantId required' });

    const before = getPortfolio();
    const beforePnl = Number(before?.pnl || 0);

    const p = getPortfolio();
    const positions = (Array.isArray(p?.positions) ? p.positions : []).filter((x: any) => (x?.variantId || null) === variantId && Number(x?.qty || 0) !== 0);
    const execs: any[] = [];

    for (const pos of positions) {
      const side: 'buy' | 'sell' = pos.qty > 0 ? 'sell' : 'buy';
      const qty = Math.abs(Number(pos.qty));
      const price = Number(pos.markPrice ?? pos.avgEntry ?? 0);
      if (!qty || !Number.isFinite(price) || price <= 0) continue;
      const exec = toExec({ symbol: pos.symbol, variantId, side, qty, price, reason: 'manual_flatten_variant' });
      recordExecution(exec as any);
      execs.push(exec);
    }

    const after = getPortfolio();
    const afterPnl = Number(after?.pnl || 0);
    const realizedAmount = Number((afterPnl - beforePnl).toFixed(6));

    return res.json({ ok: true, action: 'flatten-variant', variantId, executions: execs, realizedAmount, timestamp: new Date().toISOString(), portfolio: after });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'manual flatten-variant failed' });
  }
});

router.post('/manual/flatten-all', (_req, res) => {
  try {
    const before = getPortfolio();
    const beforePnl = Number(before?.pnl || 0);

    const p = getPortfolio();
    const positions = (Array.isArray(p?.positions) ? p.positions : []).filter((x: any) => Number(x?.qty || 0) !== 0);
    const execs: any[] = [];

    for (const pos of positions) {
      const side: 'buy' | 'sell' = pos.qty > 0 ? 'sell' : 'buy';
      const qty = Math.abs(Number(pos.qty));
      const price = Number(pos.markPrice ?? pos.avgEntry ?? 0);
      if (!qty || !Number.isFinite(price) || price <= 0) continue;
      const exec = toExec({ symbol: pos.symbol, variantId: pos.variantId || null, side, qty, price, reason: 'manual_flatten_all' });
      recordExecution(exec as any);
      execs.push(exec);
    }

    const after = getPortfolio();
    const afterPnl = Number(after?.pnl || 0);
    const realizedAmount = Number((afterPnl - beforePnl).toFixed(6));

    return res.json({ ok: true, action: 'flatten-all', executions: execs, realizedAmount, timestamp: new Date().toISOString(), portfolio: after });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || 'manual flatten-all failed' });
  }
});

export default router;
