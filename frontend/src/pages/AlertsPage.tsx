import React, { useEffect, useMemo, useState } from 'react';
import { fetchRisks, fetchStatus, fetchPortfolio, fetchRiskStatus, resetRisk } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';

const AlertsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [riskStatus, setRiskStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async (mounted = true) => {
    try {
      const [s, rk, rs, pf] = await Promise.all([fetchStatus(), fetchRisks(), fetchRiskStatus(), fetchPortfolio()]);
      if (!mounted) return;
      setStatus(s);
      setRisks(Array.isArray(rk) ? rk.filter(Boolean) : []);
      setRiskStatus(rs && typeof rs === 'object' ? rs : null);
      setPortfolio(pf && typeof pf === 'object' ? pf : null);
      setError(null);
    } catch (e: any) {
      if (!mounted) return;
      setError(e?.message || 'Data unavailable');
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
        subtitle={loading ? 'Loading…' : 'Global risk diagnostics and controls'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : (riskStatus?.tradingAllowed ? 'LIVE' : 'RISK_BLOCKED')}
        activeSymbol="RISK"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Risk Events" value={risks.length || 'No data'} />
        <KpiCard label="Blocked" value={blocked || 0} tone={blocked > 0 ? 'negative' : 'neutral'} />
        <KpiCard label="Trading Allowed" value={riskStatus?.tradingAllowed ? 'Yes' : 'No'} tone={riskStatus?.tradingAllowed ? 'positive' : 'negative'} />
        <KpiCard label="Kill Switch" value={riskStatus?.killSwitch ? 'ON' : 'OFF'} tone={riskStatus?.killSwitch ? 'negative' : 'positive'} />
        <KpiCard label="Daily PnL" value={typeof riskStatus?.currentDailyPnl === 'number' ? riskStatus.currentDailyPnl.toFixed(2) : 'No data'} />
        <KpiCard label="Daily Loss %" value={typeof riskStatus?.dailyLossPercent === 'number' ? `${riskStatus.dailyLossPercent.toFixed(2)}%` : 'No data'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>{error}</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Global Risk Status">
          <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.7 }}>
            <div>activeBlockReason: {riskStatus?.activeBlockReason || 'none'}</div>
            <div>blockScope: {riskStatus?.blockScope || 'none'}</div>
            <div>baselineEquity: {riskStatus?.baselineEquity ?? '—'}</div>
            <div>peakEquity: {riskStatus?.peakEquity ?? '—'}</div>
            <div>threshold.dailyLossPercent: {riskStatus?.threshold?.dailyLossPercent ?? '—'}</div>
            <div>threshold.drawdownPercent: {riskStatus?.threshold?.drawdownPercent ?? '—'}</div>
            <div>lastBlockTimestamp: {riskStatus?.lastBlockTimestamp || '—'}</div>
          </div>
          <button onClick={async () => { await resetRisk(); await load(true); }} style={{ marginTop: 10 }}>Reset Risk</button>
        </SectionCard>

        <SectionCard title="Risk Exposure Chart">
          {exposureData.length ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={exposureData}><CartesianGrid stroke="#233" /><XAxis dataKey="symbol" /><YAxis /><Tooltip /><Area dataKey="exposure" stroke="#ff8da1" fill="#5f2538" /></AreaChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>No samples yet</div>}
        </SectionCard>
      </div>

      <SectionCard title="Live Risk Feed" style={{ marginTop: 10 } as any}>
        {risks.length ? (
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
            {risks.slice(0, 20).map((r, i) => <div key={i}>{r?.symbol ?? '—'} · {r?.side ?? '—'} · {r?.variantId || 'default'} · {r?.blockedBy || (r?.approved ? 'approved' : 'blocked')} · {r?.reason || '—'}</div>)}
          </div>
        ) : <div style={{ color: '#9cb1d3' }}>No risk events yet</div>}
      </SectionCard>
    </div>
  );
};

export default AlertsPage;
