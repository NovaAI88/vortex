import React, { useEffect, useMemo, useState } from 'react';
import { fetchStatus, fetchPortfolio } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, AreaChart, Area } from 'recharts';

const fmt = (v: any) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Data unavailable');

const DashboardPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, p] = await Promise.all([fetchStatus(), fetchPortfolio()]);
        if (!mounted) return;
        setStatus(s);
        setPortfolio(p && typeof p === 'object' ? p : null);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Data unavailable');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const trades = Array.isArray(portfolio?.trades) ? portfolio.trades.filter(Boolean) : [];
  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions.filter(Boolean) : [];

  const equityCurve = useMemo(() => {
    let pnl = 0;
    return trades.slice(0, 60).reverse().map((t: any, i: number) => {
      pnl += Number(t?.reason?.includes('failed') ? 0 : 0);
      const eq = Number(portfolio?.equity ?? portfolio?.totalValue ?? 0);
      return { idx: i + 1, equity: eq };
    });
  }, [trades, portfolio]);

  const tradeFrequency = useMemo(() => {
    const buckets: Record<string, number> = {};
    trades.slice(0, 120).forEach((t: any) => {
      const ts = t?.timestamp ? new Date(t.timestamp) : null;
      const key = ts ? `${ts.getHours().toString().padStart(2, '0')}:${Math.floor(ts.getMinutes() / 15) * 15}` : 'unknown';
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).slice(-16).map(([k, v]) => ({ bucket: k, trades: v }));
  }, [trades]);

  const exposureData = useMemo(() => {
    return positions.slice(0, 12).map((p: any) => {
      const qty = Number(p?.qty || 0);
      const mark = Number(p?.markPrice ?? p?.avgEntry ?? 0);
      return { symbol: p?.symbol || '—', exposure: Math.abs(qty * mark) };
    });
  }, [positions]);

  return (
    <div>
      <PageHeaderBar
        title="AETHER Dashboard"
        subtitle={loading ? 'Loading…' : 'Real backend account overview'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : String(status?.status || 'UNKNOWN').toUpperCase()}
        activeSymbol="PORTFOLIO"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Cash" value={fmt(portfolio?.cash ?? portfolio?.balance)} />
        <KpiCard label="Equity" value={fmt(portfolio?.equity ?? portfolio?.totalValue)} />
        <KpiCard label="Realized PnL" value={fmt(portfolio?.pnl)} tone={Number(portfolio?.pnl || 0) >= 0 ? 'positive' : 'negative'} />
        <KpiCard label="Open Positions" value={positions.length || 'Data unavailable'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>{error}</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Equity Curve">
          {equityCurve.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={equityCurve}><CartesianGrid stroke="#233" /><XAxis dataKey="idx" /><YAxis /><Tooltip /><Line dataKey="equity" stroke="#6be3ff" dot={false} /></LineChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>

        <SectionCard title="Trade Frequency">
          {tradeFrequency.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={tradeFrequency}><CartesianGrid stroke="#233" /><XAxis dataKey="bucket" /><YAxis /><Tooltip /><Bar dataKey="trades" fill="#70b7ff" /></BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
        <SectionCard title="Risk Exposure">
          {exposureData.length ? (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={exposureData}><CartesianGrid stroke="#233" /><XAxis dataKey="symbol" /><YAxis /><Tooltip /><Area dataKey="exposure" stroke="#ff9d9d" fill="#6f2d45" /></AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default DashboardPage;
