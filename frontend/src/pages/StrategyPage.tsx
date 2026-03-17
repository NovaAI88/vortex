import React, { useEffect, useMemo, useState } from 'react';
import { fetchStrategyPerformance, fetchStrategyWeights, fetchStatus, fetchRuntimeState } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#60d9ff', '#9f8bff', '#5ff5c8', '#ffb36b', '#ff7f9d', '#77a7ff'];

const StrategyPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [runtime, setRuntime] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, rt, perfRes, weightsRes] = await Promise.all([
          fetchStatus(),
          fetchRuntimeState().catch(() => null),
          fetchStrategyPerformance().catch(() => []),
          fetchStrategyWeights().catch(() => ({})),
        ]);
        if (!mounted) return;
        setStatus(s);
        setRuntime(rt);
        setPerformance(Array.isArray(perfRes) ? perfRes.filter(Boolean) : []);
        setWeights(weightsRes && typeof weightsRes === 'object' ? weightsRes : {});
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Data unavailable');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const perfChart = useMemo(() => performance.map((p: any) => ({ name: `${p?.variantId || 'default'} (${p?.strategyId || 'unknown'})`, pnl: Number(p?.realizedPnL || 0) })), [performance]);
  const weightChart = useMemo(() => Object.entries(weights).map(([k, v]) => ({ name: k, value: Number(v || 0) })), [weights]);

  return (
    <div>
      <PageHeaderBar
        title="Strategy Intelligence"
        subtitle={loading ? 'Loading…' : 'Real strategy weights/performance endpoints only'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : (runtime?.runtimeState || 'LIVE')}
        activeSymbol="STRATEGY"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Strategy Rows" value={performance.length} />
        <KpiCard label="Weight Keys" value={Object.keys(weights).length} />
      </KpiStrip>

      <SectionCard title="Endpoint Truth" style={{ marginTop: 10 } as any}>
        <div style={{ fontSize: 12, color: '#c7d6ef' }}>
          Source endpoints: `/api/strategies/performance`, `/api/strategies/weights`. {Object.keys(weights).length <= 1 ? 'Single weight key is expected if only one strategy family is active.' : ''}
        </div>
      </SectionCard>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Variant Performance">
          {perfChart.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={perfChart}><CartesianGrid stroke="#233" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Bar dataKey="pnl" fill="#62d7ff" /></BarChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>No performance rows yet</div>}
        </SectionCard>

        <SectionCard title="Strategy Weights">
          {weightChart.length > 1 ? (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart><Pie data={weightChart} dataKey="value" nameKey="name" outerRadius={90}>{weightChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
          ) : <div style={{ color: '#9cb1d3' }}>{weightChart.length === 1 ? `Single active weight: ${weightChart[0].name}=${weightChart[0].value}` : 'No weight data yet'}</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default StrategyPage;
