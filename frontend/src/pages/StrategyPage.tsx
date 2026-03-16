import React, { useEffect, useMemo, useState } from 'react';
import { fetchDecisions, fetchSignals, fetchStrategyPerformance, fetchStrategyWeights, fetchStatus } from '../api/apiClient';
import StrategyPerformanceTable from '../components/StrategyPerformanceTable';
import StrategyWeightsPanel from '../components/StrategyWeightsPanel';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const POLL_INTERVAL = 5000;

const StrategyPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [performance, setPerformance] = useState<any[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [signals, setSignals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setError(null);
      try {
        const [s, perfRes, weightsRes, signalRes, decisionRes] = await Promise.all([
          fetchStatus(),
          fetchStrategyPerformance().catch(() => []),
          fetchStrategyWeights().catch(() => ({})),
          fetchSignals().catch(() => []),
          fetchDecisions().catch(() => []),
        ]);
        if (!mounted) return;
        setStatus(s);
        setPerformance(Array.isArray(perfRes) ? perfRes : []);
        setWeights(weightsRes && typeof weightsRes === 'object' ? weightsRes : {});
        setSignals(Array.isArray(signalRes) ? signalRes : []);
        setDecisions(Array.isArray(decisionRes) ? decisionRes : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Backend not connected');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const tid = setInterval(load, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(tid);
    };
  }, []);

  const activeStrategies = useMemo(() => {
    const perfIds = performance.map((p) => p.strategyId).filter(Boolean);
    const weightIds = Object.keys(weights);
    return new Set([...perfIds, ...weightIds]).size;
  }, [performance, weights]);

  const strategyPnl = useMemo(
    () => performance.reduce((sum, p) => sum + (typeof p.realizedPnL === 'number' ? p.realizedPnL : 0), 0),
    [performance]
  );

  const capitalAllocation = useMemo(() => {
    const sum = Object.values(weights).reduce<number>((acc, value) => acc + (typeof value === 'number' ? value : 0), 0);
    return sum > 0 ? `${(sum * 100).toFixed(1)}%` : 'No data';
  }, [weights]);

  return (
    <div>
      <PageHeaderBar
        title="Strategy Intelligence Terminal"
        subtitle={loading ? 'Loading…' : 'Only live strategy endpoints and execution telemetry'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'LIVE STRATEGY'}
        activeSymbol="STRATEGY"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Active Strategies" value={activeStrategies || 'No data'} />
        <KpiCard label="Strategy PnL" value={performance.length ? strategyPnl.toFixed(2) : 'No data'} tone={strategyPnl >= 0 ? 'positive' : 'negative'} />
        <KpiCard label="Capital Allocation" value={capitalAllocation} />
        <KpiCard label="Signals" value={signals.length} />
        <KpiCard label="Decisions" value={decisions.length} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Strategy Performance">
          <StrategyPerformanceTable />
        </SectionCard>
        <SectionCard title="Strategy Weights">
          <StrategyWeightsPanel />
        </SectionCard>
      </div>
    </div>
  );
};

export default StrategyPage;
