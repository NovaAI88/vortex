import { describe, it, expect, beforeEach } from 'vitest';
import {
  resetPortfolio,
  recordExecution,
  getPortfolio,
  forceClosePosition,
  partialClosePosition,
} from '../../src/portfolio/state/portfolioLedger';

type Side = 'buy' | 'sell';

function exec(side: Side, qty: number, price: number, variantId?: string) {
  return {
    id: (Math.random() * 1e17).toString(36),
    executionRequestId: `req-${Math.random()}`,
    riskDecisionId: `risk-${Math.random()}`,
    actionCandidateId: `ac-${Math.random()}`,
    signalId: `sig-${Math.random()}`,
    strategyId: 'test-strategy',
    symbol: 'BTCUSDT',
    side,
    qty,
    price,
    variantId,
    status: 'simulated' as const,
    reason: 'test',
    adapter: 'test',
    timestamp: new Date().toISOString(),
  };
}

function getVariant(portfolio: ReturnType<typeof getPortfolio>, id: string) {
  const v = portfolio.variantPortfolios.find(vp => vp.variantId === id);
  if (!v) throw new Error(`variant ${id} not found`);
  return v;
}

function approx(a: number, b: number, p = 2) {
  expect(a).toBeCloseTo(b, p);
}

describe('portfolioLedger accounting deterministic validation', () => {
  beforeEach(() => {
    resetPortfolio();
  });

  it('long round-trip win', () => {
    recordExecution(exec('buy', 1, 100));
    recordExecution(exec('sell', 1, 110));

    const p = getPortfolio();
    approx(p.balance, 10010, 2);
    approx(p.pnl, 10, 2);
    approx(p.equity, 10010, 2);
    expect(p.positions.length).toBe(0);
  });

  it('short round-trip win', () => {
    recordExecution(exec('sell', 1, 100));
    recordExecution(exec('buy', 1, 90));

    const p = getPortfolio();
    approx(p.balance, 10010, 2);
    approx(p.pnl, 10, 2);
    approx(p.equity, 10010, 2);
    expect(p.positions.length).toBe(0);
  });

  it('short round-trip loss', () => {
    recordExecution(exec('sell', 1, 100));
    recordExecution(exec('buy', 1, 110));

    const p = getPortfolio();
    approx(p.balance, 9990, 2);
    approx(p.pnl, -10, 2);
    approx(p.equity, 9990, 2);
    expect(p.positions.length).toBe(0);
  });

  it('variantBook equity consistency after forceClosePosition', () => {
    recordExecution(exec('buy', 1, 100, 'trend-v1'));

    const pnl = forceClosePosition('BTCUSDT::trend-v1', 110, 'test-force-close');
    expect(pnl).not.toBeNull();

    const p = getPortfolio();
    const v = getVariant(p, 'trend-v1');

    expect(v.positions.length).toBe(0);
    approx(v.balance, v.equity, 2);
    approx(v.pnl, 10, 2);
  });

  it('variantBook equity consistency after partialClosePosition', () => {
    recordExecution(exec('buy', 1, 100, 'trend-v1'));

    const partial = partialClosePosition('BTCUSDT::trend-v1', 0.5, 110, 'test-partial');
    expect(partial).not.toBeNull();

    let p = getPortfolio();
    let v = getVariant(p, 'trend-v1');

    expect(v.positions.length).toBe(1);

    const pos = v.positions[0];
    const expectedEquity = Number((v.balance + (pos.qty * (pos.markPrice ?? 0))).toFixed(2));
    approx(v.equity, expectedEquity, 2);

    const final = forceClosePosition('BTCUSDT::trend-v1', 110, 'test-final-close');
    expect(final).not.toBeNull();

    p = getPortfolio();
    v = getVariant(p, 'trend-v1');

    expect(v.positions.length).toBe(0);
    approx(v.balance, v.equity, 2);
    approx(v.pnl, 10, 2);
  });
});
