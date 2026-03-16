import React, { useEffect, useState } from 'react';
import { fetchPortfolio, fetchStatus } from '../api/apiClient';
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

  useEffect(() => {
    let mounted = true;
    const load = async () => {
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
    load();
    const t = setInterval(load, 4000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions : [];
  const trades = Array.isArray(portfolio?.trades) ? portfolio.trades : [];

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

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}
      {!error && !loading && !portfolio ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14 }}>No live portfolio data available yet.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Open Positions">
          {positions.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {positions.map((p: any, i: number) => <div key={i}>{p.symbol} · {p.side} · qty {p.qty} · avg {fmt(p.avgEntry)} · var {p.variantId || 'default'}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No open positions.</div>}
        </SectionCard>

        <SectionCard title="Recent Trades">
          {trades.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {trades.slice(0, 12).map((t: any, i: number) => <div key={i}>{t.symbol} · {String(t.side || '—').toUpperCase()} · qty {fmt(t.qty)} · {fmt(t.price)} · {t.variantId || 'default'}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No trades available.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default PortfolioPage;
