import React, { useEffect, useMemo, useState } from 'react';
import { fetchStatus, fetchPortfolio, fetchRuntimeState } from '../api/apiClient';
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
  const [runtime, setRuntime] = useState<any>(null);
  const [history, setHistory] = useState<Array<{ ts: string; equity: number; exposure: number; openPositions: number; trades: number }>>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, p, rt] = await Promise.all([
          fetchStatus(),
          fetchPortfolio(),
          fetchRuntimeState().catch(() => null),
        ]);
        if (!mounted) return;
        setStatus(s);
        const safePortfolio = p && typeof p === 'object' ? p : null;
        setPortfolio(safePortfolio);
        setRuntime(rt && typeof rt === 'object' ? rt : null);
        if (safePortfolio) {
          const openPositions = Array.isArray(safePortfolio?.positions) ? safePortfolio.positions.filter((x: any) => Number(x?.qty || 0) !== 0).length : 0;
          const exposure = Array.isArray(safePortfolio?.positions)
            ? safePortfolio.positions.reduce((sum: number, pos: any) => sum + Math.abs((Number(pos?.qty) || 0) * (Number(pos?.markPrice ?? pos?.avgEntry ?? 0))), 0)
            : 0;
          setHistory(prev => {
            const next = [...prev, {
              ts: new Date().toISOString(),
              equity: Number(safePortfolio?.equity ?? safePortfolio?.totalValue ?? 0),
              exposure,
              openPositions,
              trades: Array.isArray(safePortfolio?.trades) ? safePortfolio.trades.length : 0,
            }];
            return next.slice(-120);
          });
        }
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
    return history.map((h, i) => ({ idx: i + 1, time: new Date(h.ts).toLocaleTimeString(), equity: h.equity }));
  }, [history]);

  const tradeFrequency = useMemo(() => {
    const buckets: Record<string, number> = {};
    trades.slice(0, 160).forEach((t: any) => {
      const ts = t?.timestamp ? new Date(t.timestamp) : null;
      const key = ts ? `${ts.getHours().toString().padStart(2, '0')}:${Math.floor(ts.getMinutes() / 15) * 15}` : 'unknown';
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets).slice(-16).map(([k, v]) => ({ bucket: k, trades: v }));
  }, [trades]);

  const exposureData = useMemo(() => {
    return history.map((h, i) => ({ idx: i + 1, time: new Date(h.ts).toLocaleTimeString(), exposure: h.exposure, openPositions: h.openPositions }));
  }, [history]);

  const latestRiskBlocked = useMemo(() => {
    const blocked = (riskEvents || []).find((r: any) => r?.status?.includes?.('blocked') || r?.approved === false);
    return blocked || null;
  }, [riskEvents]);

  const runtimeStateLabel = useMemo(() => {
    if (error) return 'DISCONNECTED';
    if (operator?.tradingEnabled === false) return 'PAUSED';
    if (latestRiskBlocked) return 'RISK-BLOCKED';
    return 'LIVE';
  }, [error, operator, latestRiskBlocked]);

  return (
    <div>
      <PageHeaderBar
        title="AETHER Dashboard"
        subtitle={loading ? 'Loading…' : 'Real backend account overview'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={runtimeStateLabel}
        activeSymbol="PORTFOLIO"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Cash" value={fmt(portfolio?.cash ?? portfolio?.balance)} />
        <KpiCard label="Equity" value={fmt(portfolio?.equity ?? portfolio?.totalValue)} />
        <KpiCard label="Realized PnL" value={fmt(portfolio?.pnl)} tone={Number(portfolio?.pnl || 0) >= 0 ? 'positive' : 'negative'} />
        <KpiCard label="Open Positions" value={Array.isArray(portfolio?.positions) ? positions.length : 'No data'} />
      </KpiStrip>

      <div className="ui-card" style={{ marginTop: 10, padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ padding: '4px 8px', borderRadius: 999, background: runtimeStateLabel === 'LIVE' ? '#1c3d2c' : '#3b2430', color: '#dfffe9', border: '1px solid #355f49', fontSize: 12 }}>
          {runtimeStateLabel}
        </span>
        <span style={{ padding: '4px 8px', borderRadius: 999, background: '#1c2638', color: '#dbe7ff', border: '1px solid #334b78', fontSize: 12 }}>
          Trading: {operator?.tradingEnabled === false ? 'Paused' : 'Enabled'}
        </span>
        <span style={{ padding: '4px 8px', borderRadius: 999, background: '#2a223b', color: '#e8ddff', border: '1px solid #5d4b8a', fontSize: 12 }}>
          Risk blocks: {Array.isArray(riskEvents) ? riskEvents.filter((r: any) => r?.status?.includes?.('blocked') || r?.approved === false).length : 0}
        </span>
      </div>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>{error}</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Equity Curve">
          {equityCurve.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={equityCurve}><CartesianGrid stroke="#233" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Line dataKey="equity" stroke="#6be3ff" dot={false} /></LineChart>
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
              <AreaChart data={exposureData}><CartesianGrid stroke="#233" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Area dataKey="exposure" stroke="#ff9d9d" fill="#6f2d45" /></AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default DashboardPage;
