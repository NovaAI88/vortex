import React, { useEffect, useMemo, useState } from 'react';
import { fetchDecisions, fetchSignals, fetchStrategyPerformance, fetchStrategyWeights } from '../api/apiClient';
import StrategyPerformanceTable from '../components/StrategyPerformanceTable';
import StrategyWeightsPanel from '../components/StrategyWeightsPanel';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

const POLL_INTERVAL = 5000;

const StrategyPage: React.FC = () => {
  const [performance, setPerformance] = useState<any[]>([]);
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [signals, setSignals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const [perfRes, weightsRes, signalRes, decisionRes] = await Promise.all([
        fetchStrategyPerformance().catch(() => []),
        fetchStrategyWeights().catch(() => ({})),
        fetchSignals().catch(() => []),
        fetchDecisions().catch(() => []),
      ]);
      if (!mounted) return;
      setPerformance(Array.isArray(perfRes) ? perfRes : []);
      setWeights(weightsRes && typeof weightsRes === 'object' ? weightsRes : {});
      setSignals(Array.isArray(signalRes) ? signalRes : []);
      setDecisions(Array.isArray(decisionRes) ? decisionRes : []);
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

  const winRate = useMemo(() => {
    const trades = performance.reduce((sum, p) => sum + (typeof p.trades === 'number' ? p.trades : 0), 0);
    const wins = performance.reduce((sum, p) => sum + (typeof p.wins === 'number' ? p.wins : 0), 0);
    return trades > 0 ? (wins / trades) * 100 : null;
  }, [performance]);

  const sharpeLike = useMemo(() => {
    const pnl = strategyPnl;
    const dd = performance.reduce((sum, p) => sum + (typeof p.maxDrawdown === 'number' ? p.maxDrawdown : 0), 0);
    return dd > 0 ? pnl / dd : null;
  }, [performance, strategyPnl]);

  const capitalAllocation = useMemo(() => {
    const sum = Object.values(weights).reduce<number>(
      (acc, value) => acc + (typeof value === 'number' ? value : 0),
      0
    );

    return sum > 0 ? `${(sum * 100).toFixed(1)}%` : 'N/A';
  }, [weights]);

  const lastExecution = useMemo(() => {
    const d = decisions[0]?.timestamp || signals[0]?.timestamp;
    return d ? new Date(d).toLocaleTimeString() : 'N/A';
  }, [decisions, signals]);

  const healthState = useMemo(() => {
    if (activeStrategies === 0) return 'info';
    if (winRate !== null && winRate < 45) return 'warning';
    return 'healthy';
  }, [activeStrategies, winRate]);

  return (
    <div>
      <PageHeaderBar
        title="Strategy Intelligence Terminal"
        subtitle="Institutional strategy performance, allocation intelligence, and execution context"
        status={healthState as any}
        statusLabel={healthState === 'healthy' ? 'PERFORMING' : healthState === 'warning' ? 'WATCH' : 'INITIALIZING'}
        activeSymbol="STRATEGIES"
        timestamp={lastExecution !== 'N/A' ? lastExecution : undefined}
      />

      <KpiStrip>
        <KpiCard label="Active Strategies" value={activeStrategies || 'N/A'} />
        <KpiCard label="Strategy PnL" value={performance.length ? strategyPnl.toFixed(2) : 'N/A'} tone={strategyPnl >= 0 ? 'positive' : 'negative'} />
        <KpiCard label="Win Rate" value={winRate !== null ? `${winRate.toFixed(1)}%` : 'N/A'} tone={winRate !== null && winRate >= 50 ? 'positive' : 'neutral'} />
        <KpiCard label="Sharpe / Score" value={sharpeLike !== null ? sharpeLike.toFixed(2) : 'N/A'} />
        <KpiCard label="Capital Allocation" value={capitalAllocation} />
        <KpiCard label="Last Execution" value={lastExecution} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)' }}>
        <SectionCard title="Strategy Performance Overview">
          <StrategyPerformanceTable />
        </SectionCard>

        <SectionCard
          title="Strategy Health Stack"
          actionSlot={<HealthBadge state={healthState as any} label={healthState === 'healthy' ? 'HEALTHY' : healthState === 'warning' ? 'MONITOR' : 'INFO'} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Allocation State</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Capital allocated: <b style={{ color: '#eaf1ff' }}>{capitalAllocation}</b><br />
                Strategies active: <b style={{ color: '#eaf1ff' }}>{activeStrategies || 'N/A'}</b>
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Operator Interpretation</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Performance breadth remains {activeStrategies > 1 ? 'distributed across multiple strategy lanes' : 'concentrated'}. Monitor win-rate drift and avoid over-allocation when conviction weakens.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="Strategy Weights / Allocation Panel">
          <StrategyWeightsPanel />
        </SectionCard>

        <SectionCard title="Strategy Execution Context">
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Model Signals</div>
              <div style={{ color: '#bdd0ef', fontSize: 13 }}>
                Recent signals: <b style={{ color: '#eaf1ff' }}>{signals.length || 'N/A'}</b>
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Recent Strategy Decisions</div>
              <div style={{ color: '#bdd0ef', fontSize: 13 }}>
                Decisions observed: <b style={{ color: '#eaf1ff' }}>{decisions.length || 'N/A'}</b>
              </div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Strategy Pressure Interpretation</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Pressure appears {signals.length > decisions.length ? 'signal-led' : 'execution-led'}; align allocation updates with decision quality, not just signal velocity.
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="Strategy Intelligence Interpretation"
          text="Strategy complex is operational with measurable allocation and performance flow. Continue optimizing for consistency of returns versus drawdown burden."
          source="Strategy intelligence layer"
        />
        <InsightCard
          title="Operator Action Guidance"
          text="Increase capital only where strategy win-rate and realized PnL stay aligned over consecutive cycles. If dispersion increases, rotate to defensive allocation until stability returns."
          source="Operator protocol"
        />
      </div>
    </div>
  );
};

export default StrategyPage;
