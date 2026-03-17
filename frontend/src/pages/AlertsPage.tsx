import React, { useEffect, useMemo, useState } from 'react';
import { fetchRisks, fetchStatus, fetchPortfolio } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const AlertsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, rk, pf] = await Promise.all([fetchStatus(), fetchRisks(), fetchPortfolio()]);
        if (!mounted) return;
        setStatus(s);
        setRisks(Array.isArray(rk) ? rk.filter(Boolean) : []);
        setPortfolio(pf && typeof pf === 'object' ? pf : null);
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

  const blocked = risks.filter((r) => r?.blockedBy || r?.approved === false).length;
  const positions = Array.isArray(portfolio?.positions) ? portfolio.positions.filter(Boolean) : [];
  const exposureData = useMemo(() => positions.map((p: any) => ({
    symbol: p?.symbol || '—',
    exposure: Math.abs((Number(p?.qty) || 0) * (Number(p?.markPrice ?? p?.avgEntry ?? 0))),
  })), [positions]);

  return (
    <div>
      <PageHeaderBar
        title="Risk Terminal"
        subtitle={loading ? 'Loading…' : 'Real risk + portfolio exposure only'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'LIVE'}
        activeSymbol="RISK"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Risk Events" value={risks.length || 'Data unavailable'} />
        <KpiCard label="Blocked" value={blocked || 'Data unavailable'} tone={blocked > 0 ? 'negative' : 'neutral'} />
        <KpiCard label="Open Exposure" value={typeof portfolio?.positionsValue === 'number' ? portfolio.positionsValue.toFixed(2) : 'Data unavailable'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>{error}</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Risk Exposure Chart">
          {exposureData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={exposureData}><CartesianGrid stroke="#233" /><XAxis dataKey="symbol" /><YAxis /><Tooltip /><Area dataKey="exposure" stroke="#ff8da1" fill="#5f2538" /></AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>

        <SectionCard title="Live Risk Feed">
          {risks.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {risks.slice(0, 16).map((r, i) => <div key={i}>{r?.symbol ?? 'Data unavailable'} · {r?.side ?? 'Data unavailable'} · {r?.variantId || 'default'} · {r?.blockedBy || (r?.approved ? 'approved' : 'blocked')}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default AlertsPage;
