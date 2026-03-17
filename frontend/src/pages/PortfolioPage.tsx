import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchPortfolio,
  fetchStatus,
  fetchOperatorState,
  startTrading,
  pauseTrading,
  manualClosePosition,
  manualFlattenAll,
  manualFlattenVariant,
  manualTakeProfit,
} from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const fmt = (v: any, d = 2) => {
  const n = typeof v === 'number' ? v : (typeof v === 'string' ? Number(v) : NaN);
  return Number.isFinite(n) ? n.toLocaleString(undefined, { maximumFractionDigits: d }) : '—';
};

type ManualLedgerItem = {
  timestamp: string;
  action: string;
  target: string;
  fraction?: number | null;
  result: 'success' | 'failed';
  realizedAmount?: number | null;
  note?: string;
};

const PortfolioPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [operator, setOperator] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [manualResult, setManualResult] = useState<any>(null);
  const [manualLedger, setManualLedger] = useState<ManualLedgerItem[]>([]);

  const load = async (mounted = true) => {
    setError(null);
    try {
      const [s, op, p] = await Promise.all([
        fetchStatus(),
        fetchOperatorState().catch(() => null),
        fetchPortfolio(),
      ]);
      if (!mounted) return;
      setStatus(s);
      setOperator(op && typeof op === 'object' ? op : null);
      setPortfolio(p && typeof p === 'object' ? p : null);
    } catch (e: any) {
      if (!mounted) return;
      setError(e?.message || 'Backend not connected');
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load(mounted);
    const t = setInterval(() => load(mounted), 4000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions.filter(Boolean) : [];
  const trades = Array.isArray(portfolio?.trades) ? portfolio.trades.filter(Boolean) : [];
  const variantBooks = Array.isArray(portfolio?.variantPortfolios) ? portfolio.variantPortfolios.filter(Boolean) : [];

  const unrealizedPnl = useMemo(
    () => positions.reduce((sum: number, p: any) => sum + (typeof p?.unrealizedPnL === 'number' ? p.unrealizedPnL : 0), 0),
    [positions]
  );

  const openExposure = useMemo(
    () => positions.reduce((sum: number, p: any) => sum + Math.abs((Number(p?.qty) || 0) * (Number(p?.markPrice) || Number(p?.avgEntry) || 0)), 0),
    [positions]
  );

  const variantIds = useMemo(() => {
    const idSet = new Set<string>(['v1', 'v2', 'v3']);
    positions.forEach((p: any) => { if (p?.variantId) idSet.add(String(p.variantId)); });
    variantBooks.forEach((v: any) => { if (v?.variantId) idSet.add(String(v.variantId)); });
    return Array.from(idSet);
  }, [positions, variantBooks]);

  const appendLedger = (item: ManualLedgerItem) => {
    setManualLedger((prev) => [item, ...prev].slice(0, 40));
  };

  const runManual = async (
    label: string,
    target: string,
    fn: () => Promise<any>,
    fraction?: number | null,
    note?: string
  ) => {
    setManualBusy(true);
    setManualError(null);
    try {
      const result = await fn();
      setManualResult(result);
      appendLedger({
        timestamp: result?.timestamp || new Date().toISOString(),
        action: label,
        target,
        fraction: fraction ?? null,
        result: 'success',
        realizedAmount: typeof result?.realizedAmount === 'number' ? result.realizedAmount : null,
        note,
      });
      await load(true);
    } catch (e: any) {
      const msg = e?.message || 'Manual trade action failed';
      setManualError(msg);
      appendLedger({
        timestamp: new Date().toISOString(),
        action: label,
        target,
        fraction: fraction ?? null,
        result: 'failed',
        realizedAmount: null,
        note: msg,
      });
    } finally {
      setManualBusy(false);
    }
  };

  const tradingEnabled = operator?.tradingEnabled;

  return (
    <div>
      <PageHeaderBar
        title="Portfolio Command Center"
        subtitle={loading ? 'Loading…' : 'Real backend portfolio + operator manual controls'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : tradingEnabled === false ? 'PAUSED' : 'LIVE'}
        activeSymbol="PORTFOLIO"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Cash" value={fmt(portfolio?.cash ?? portfolio?.balance)} />
        <KpiCard label="Equity" value={fmt(portfolio?.equity ?? portfolio?.totalValue)} />
        <KpiCard label="Realized PnL" value={fmt(portfolio?.pnl)} tone={typeof portfolio?.pnl === 'number' ? (portfolio.pnl >= 0 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Unrealized PnL" value={fmt(unrealizedPnl)} tone={unrealizedPnl >= 0 ? 'positive' : 'negative'} />
        <KpiCard label="Open Exposure" value={fmt(openExposure)} />
        <KpiCard label="Open Positions" value={positions.filter((p: any) => Number(p?.qty || 0) !== 0).length} />
        <KpiCard label="Trade Count" value={trades.length} />
        <KpiCard label="Trading State" value={tradingEnabled === true ? 'LIVE' : tradingEnabled === false ? 'PAUSED' : 'No data'} tone={tradingEnabled === true ? 'positive' : tradingEnabled === false ? 'negative' : 'neutral'} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1.35fr 1fr', marginTop: 10 }}>
        <SectionCard title="Unified Manual Controls">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button disabled={manualBusy || tradingEnabled === true} onClick={() => runManual('Start Trading', 'operator', () => startTrading(), null, 'operator start')} style={{ background: '#1e2d45', color: '#dff6ff', border: '1px solid #35507a', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Start Trading</button>
            <button disabled={manualBusy || tradingEnabled === false} onClick={() => runManual('Pause Trading', 'operator', () => pauseTrading(), null, 'operator pause')} style={{ background: '#3a1f2a', color: '#ffdede', border: '1px solid #7b3f4f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Pause Trading</button>
            <button disabled={manualBusy} onClick={() => runManual('Flatten All', 'all', () => manualFlattenAll())} style={{ background: '#3b2430', color: '#ffe1e1', border: '1px solid #7a4a5f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Flatten All</button>
            {variantIds.map((id) => (
              <button key={id} disabled={manualBusy} onClick={() => runManual('Flatten Variant', id, () => manualFlattenVariant(id), null, `flatten variant ${id}`)} style={{ background: '#2b2f4a', color: '#dce7ff', border: '1px solid #4b5b87', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                Flatten {id}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#a8bbdb' }}>Last manual action result: {manualResult ? `${manualResult?.action || 'action'} (${manualResult?.ok ? 'success' : 'failed'})` : 'None yet'}</div>
          <div style={{ fontSize: 12, color: '#a8bbdb', marginTop: 4 }}>Last action timestamp: {manualResult?.timestamp ? new Date(manualResult.timestamp).toLocaleString() : '—'}</div>
          <div style={{ fontSize: 12, color: '#a8bbdb', marginTop: 4 }}>Last realized amount: {typeof manualResult?.realizedAmount === 'number' ? fmt(manualResult.realizedAmount, 4) : '—'}</div>
          {manualError ? <div style={{ marginTop: 8, color: '#ffb8b8', fontSize: 12 }}>{manualError}</div> : null}
        </SectionCard>

        <SectionCard title="Variant Portfolio Breakdown">
          {variantBooks.length ? (
            <table className="ui-table" style={{ width: '100%' }}>
              <thead>
                <tr><th>Variant</th><th>Equity</th><th>Balance</th><th>PnL</th><th>Open Pos</th><th>Last Action</th></tr>
              </thead>
              <tbody>
                {variantBooks.map((v: any, i: number) => {
                  const openCount = Array.isArray(v?.positions) ? v.positions.filter((p: any) => Number(p?.qty || 0) !== 0).length : 0;
                  const lastAction = manualLedger.find((x) => x?.target === v?.variantId || x?.target === 'all');
                  return (
                    <tr key={i}>
                      <td>{v?.variantId || '—'}</td>
                      <td>{fmt(v?.equity)}</td>
                      <td>{fmt(v?.balance)}</td>
                      <td>{fmt(v?.pnl)}</td>
                      <td>{openCount}</td>
                      <td>{lastAction ? `${lastAction.action} @ ${new Date(lastAction.timestamp).toLocaleTimeString()}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div style={{ color: '#9cb1d3' }}>No variant portfolio breakdown available.</div>}
        </SectionCard>
      </div>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14, marginTop: 10 }}>Backend not connected.</div> : null}
      {!error && !loading && !portfolio ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14, marginTop: 10 }}>No live portfolio data available yet.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
        <SectionCard title="Open Positions (exchange-style)">
          {positions.length ? (
            <table className="ui-table" style={{ width: '100%' }}>
              <thead>
                <tr>
                  <th>Symbol</th><th>Side</th><th>Variant</th><th>Qty</th><th>Avg Entry</th><th>Mark</th><th>Unrealized PnL</th><th>Realized PnL</th><th>Exposure</th><th>Stop Loss</th><th>Take Profit</th><th>Age/Status</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {positions.map((p: any, i: number) => {
                  const qty = Number(p?.qty || 0);
                  const mark = Number(p?.markPrice ?? p?.avgEntry ?? 0);
                  const exposure = Math.abs(qty * mark);
                  const age = p?.lastUpdated ? `${Math.max(0, Math.round((Date.now() - new Date(p.lastUpdated).getTime()) / 1000))}s` : '—';
                  return (
                    <tr key={i}>
                      <td>{p?.symbol ?? '—'}</td>
                      <td>{p?.side ?? '—'}</td>
                      <td>{p?.variantId || 'default'}</td>
                      <td>{fmt(qty, 6)}</td>
                      <td>{fmt(p?.avgEntry)}</td>
                      <td>{fmt(mark)}</td>
                      <td>{fmt(p?.unrealizedPnL)}</td>
                      <td>—</td>
                      <td>{fmt(exposure)}</td>
                      <td>{fmt(p?.stopLoss)}</td>
                      <td>{fmt(p?.takeProfit)}</td>
                      <td>{age}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                          <button disabled={manualBusy} onClick={() => runManual('Take Profit', `${p?.symbol || 'BTCUSDT'}:${p?.variantId || 'default'}`, () => manualTakeProfit(p?.symbol || 'BTCUSDT', p?.variantId || null, 0.25), 0.25)} style={{ background: '#213244', color: '#d8ecff', border: '1px solid #3a5f82', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>TP25</button>
                          <button disabled={manualBusy} onClick={() => runManual('Take Profit', `${p?.symbol || 'BTCUSDT'}:${p?.variantId || 'default'}`, () => manualTakeProfit(p?.symbol || 'BTCUSDT', p?.variantId || null, 0.5), 0.5)} style={{ background: '#213244', color: '#d8ecff', border: '1px solid #3a5f82', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>TP50</button>
                          <button disabled={manualBusy} onClick={() => runManual('Take Profit', `${p?.symbol || 'BTCUSDT'}:${p?.variantId || 'default'}`, () => manualTakeProfit(p?.symbol || 'BTCUSDT', p?.variantId || null, 0.75), 0.75)} style={{ background: '#213244', color: '#d8ecff', border: '1px solid #3a5f82', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>TP75</button>
                          <button disabled={manualBusy} onClick={() => runManual('Close Position', `${p?.symbol || 'BTCUSDT'}:${p?.variantId || 'default'}`, () => manualClosePosition(p?.symbol || 'BTCUSDT', p?.variantId || null))} style={{ background: '#3b2430', color: '#ffe1e1', border: '1px solid #7a4a5f', borderRadius: 6, padding: '2px 6px', cursor: 'pointer' }}>Close</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div style={{ color: '#9cb1d3' }}>No open positions.</div>}
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
        <SectionCard title="Trade History (exchange-style)">
          {trades.length ? (
            <table className="ui-table" style={{ width: '100%' }}>
              <thead>
                <tr><th>Timestamp</th><th>Symbol</th><th>Side</th><th>Variant</th><th>Price</th><th>Qty</th><th>Notional</th><th>Status</th><th>Reason</th><th>Realized PnL</th></tr>
              </thead>
              <tbody>
                {trades.slice(0, 40).map((t: any, i: number) => {
                  const px = Number(t?.price || 0);
                  const qty = Number(t?.qty || 0);
                  return (
                    <tr key={i}>
                      <td>{t?.timestamp ? new Date(t.timestamp).toLocaleString() : '—'}</td>
                      <td>{t?.symbol ?? '—'}</td>
                      <td>{String(t?.side || '—').toUpperCase()}</td>
                      <td>{t?.variantId || 'default'}</td>
                      <td>{fmt(px)}</td>
                      <td>{fmt(qty, 6)}</td>
                      <td>{fmt(Math.abs(px * qty))}</td>
                      <td>{t?.status || '—'}</td>
                      <td>{t?.reason || '—'}</td>
                      <td>—</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : <div style={{ color: '#9cb1d3' }}>No trades available.</div>}
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
        <SectionCard title="Manual Action Ledger">
          {manualLedger.length ? (
            <table className="ui-table" style={{ width: '100%' }}>
              <thead>
                <tr><th>Timestamp</th><th>Action</th><th>Target</th><th>Fraction</th><th>Result</th><th>Realized Amount</th><th>Note</th></tr>
              </thead>
              <tbody>
                {manualLedger.map((m, i) => (
                  <tr key={i}>
                    <td>{m?.timestamp ? new Date(m.timestamp).toLocaleString() : '—'}</td>
                    <td>{m?.action || '—'}</td>
                    <td>{m?.target || '—'}</td>
                    <td>{typeof m?.fraction === 'number' ? `${Math.round(m.fraction * 100)}%` : '—'}</td>
                    <td>{m?.result || '—'}</td>
                    <td>{typeof m?.realizedAmount === 'number' ? fmt(m.realizedAmount, 4) : '—'}</td>
                    <td>{m?.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: '#9cb1d3' }}>No manual actions executed yet.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default PortfolioPage;
