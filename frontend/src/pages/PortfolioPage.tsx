import React, { useEffect, useMemo, useState } from 'react';
import { fetchPortfolio, fetchStatus, manualClosePosition, manualFlattenAll, manualFlattenVariant, manualTakeProfit } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const fmt = (v: any) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

const PortfolioPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [manualBusy, setManualBusy] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);

  const load = async (mounted = true) => {
    setError(null);
    try {
      const [s, p] = await Promise.all([fetchStatus(), fetchPortfolio()]);
      if (!mounted) return;
      setStatus(s);
      setPortfolio(p);
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

  const variantIds = useMemo(() => {
    const ids = new Set<string>();
    positions.forEach((p: any) => { if (p?.variantId) ids.add(String(p.variantId)); });
    return Array.from(ids);
  }, [positions]);

  const runManual = async (fn: () => Promise<any>) => {
    setManualBusy(true);
    setManualError(null);
    try {
      await fn();
      await load(true);
    } catch (e: any) {
      setManualError(e?.message || 'Manual trade action failed');
    } finally {
      setManualBusy(false);
    }
  };

  return (
    <div>
      <PageHeaderBar
        title="Portfolio Terminal"
        subtitle={loading ? 'Loading…' : 'Live portfolio and execution state from backend'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'LIVE PORTFOLIO'}
        activeSymbol="PORTFOLIO"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Cash" value={fmt(portfolio?.cash ?? portfolio?.balance)} />
        <KpiCard label="Equity" value={fmt(portfolio?.equity ?? portfolio?.totalValue)} />
        <KpiCard label="Realized PnL" value={fmt(portfolio?.pnl)} tone={typeof portfolio?.pnl === 'number' ? (portfolio.pnl >= 0 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Open Positions" value={positions.filter((p: any) => Number(p?.qty || 0) !== 0).length} />
        <KpiCard label="Trade Count" value={trades.length} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', marginTop: 10 }}>
        <SectionCard title="Manual Trade Controls (real backend wiring)">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
            <button disabled={manualBusy} onClick={() => runManual(() => manualFlattenAll())} style={{ background: '#3b2430', color: '#ffe1e1', border: '1px solid #7a4a5f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Flatten All</button>
            {variantIds.map((id) => (
              <button key={id} disabled={manualBusy} onClick={() => runManual(() => manualFlattenVariant(id))} style={{ background: '#2b2f4a', color: '#dce7ff', border: '1px solid #4b5b87', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>
                Flatten {id}
              </button>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#a8bbdb' }}>Actions are executed via backend manual endpoints and reflected in live portfolio/trades.</div>
          {manualError ? <div style={{ marginTop: 8, color: '#ffb8b8', fontSize: 12 }}>{manualError}</div> : null}
        </SectionCard>

        <SectionCard title="Side Insights / State">
          <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
            <div>Positions tracked: {positions.length}</div>
            <div>Recent trades: {trades.length}</div>
            <div>Manual control busy: {manualBusy ? 'Yes' : 'No'}</div>
          </div>
        </SectionCard>
      </div>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14, marginTop: 10 }}>Backend not connected.</div> : null}
      {!error && !loading && !portfolio ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14, marginTop: 10 }}>No live portfolio data available yet.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Positions (with row actions)">
          {positions.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {positions.map((p: any, i: number) => (
                <div key={i} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: '1px solid #2a3b5d' }}>
                  <div>{p?.symbol ?? '—'} · {p?.side ?? '—'} · qty {p?.qty ?? '—'} · avg {fmt(p?.avgEntry)} · var {p?.variantId || 'default'}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                    <button disabled={manualBusy} onClick={() => runManual(() => manualTakeProfit(p?.symbol || 'BTCUSDT', p?.variantId || null, 0.5))} style={{ background: '#213244', color: '#d8ecff', border: '1px solid #3a5f82', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Take Profit 50%</button>
                    <button disabled={manualBusy} onClick={() => runManual(() => manualClosePosition(p?.symbol || 'BTCUSDT', p?.variantId || null))} style={{ background: '#3b2430', color: '#ffe1e1', border: '1px solid #7a4a5f', borderRadius: 6, padding: '4px 8px', cursor: 'pointer' }}>Close Position</button>
                  </div>
                </div>
              ))}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No open positions.</div>}
        </SectionCard>

        <SectionCard title="Recent Trades">
          {trades.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {trades.slice(0, 12).map((t: any, i: number) => <div key={i}>{t?.symbol ?? '—'} · {String(t?.side || '—').toUpperCase()} · qty {fmt(t?.qty)} · {fmt(t?.price)} · {t?.variantId || 'default'}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No trades available.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default PortfolioPage;
