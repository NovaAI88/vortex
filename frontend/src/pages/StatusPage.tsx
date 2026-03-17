import React, { useEffect, useState } from 'react';
import {
  fetchStatus,
  fetchEngineStatus,
  fetchEngineRisk,
  fetchAlerts,
  fetchOperatorState,
  startTrading,
  pauseTrading,
  fetchRuntimeState,
  fetchPipelineTrace,
  resetRisk,
  overrideRisk,
  clearRiskOverride,
} from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const StatusPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [engine, setEngine] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [operator, setOperator] = useState<any>(null);
  const [runtime, setRuntime] = useState<any>(null);
  const [trace, setTrace] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const load = async (mounted = true) => {
    setError(null);
    try {
      const [s, e, r, a, op, rt, tr] = await Promise.all([
        fetchStatus(),
        fetchEngineStatus().catch(() => null),
        fetchEngineRisk().catch(() => null),
        fetchAlerts().catch(() => []),
        fetchOperatorState().catch(() => null),
        fetchRuntimeState().catch(() => null),
        fetchPipelineTrace().catch(() => []),
      ]);
      if (!mounted) return;
      setStatus(s);
      setEngine(e);
      setRisk(r);
      setAlerts(Array.isArray(a) ? a.filter(Boolean) : []);
      setOperator(op && typeof op === 'object' ? op : null);
      setRuntime(rt && typeof rt === 'object' ? rt : null);
      setTrace(Array.isArray(tr) ? tr.filter(Boolean) : []);
    } catch (err: any) {
      if (!mounted) return;
      setError(err?.message || 'Backend not connected');
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load(mounted);
    const t = setInterval(() => load(mounted), 5000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const action = async (fn: () => Promise<any>) => {
    setOperatorBusy(true);
    setOperatorError(null);
    try {
      await fn();
      await load(true);
    } catch (e: any) {
      setOperatorError(e?.message || 'Action failed');
    } finally {
      setOperatorBusy(false);
    }
  };

  const runtimeState = error ? 'DISCONNECTED' : (runtime?.runtimeState || 'IDLE');

  return (
    <div>
      <PageHeaderBar
        title="System Status Terminal"
        subtitle={loading ? 'Loading…' : 'Unified runtime truth from backend'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={runtimeState}
        activeSymbol="SYSTEM"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Backend" value={status?.status || 'No data'} tone={status?.status === 'ok' ? 'positive' : 'neutral'} />
        <KpiCard label="Runtime" value={runtimeState} tone={runtimeState === 'LIVE' ? 'positive' : runtimeState === 'RISK_BLOCKED' ? 'negative' : 'neutral'} />
        <KpiCard label="Engine Mode" value={runtime?.engineMode || engine?.mode || 'No data'} />
        <KpiCard label="Trading Allowed" value={typeof risk?.tradingAllowed === 'boolean' ? (risk.tradingAllowed ? 'Yes' : 'No') : 'No data'} />
        <KpiCard label="Kill Switch" value={risk?.killSwitch ? 'ON' : 'OFF'} tone={risk?.killSwitch ? 'negative' : 'positive'} />
        <KpiCard label="Last Updated" value={runtime?.updatedAt ? new Date(runtime.updatedAt).toLocaleTimeString() : 'No data'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-card" style={{ marginTop: 10, padding: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {['Backend', 'Engine', 'Operator', 'Risk', 'Execution', 'Portfolio'].map((k) => (
          <span key={k} style={{ padding: '3px 8px', borderRadius: 999, background: '#1c2638', color: '#dbe7ff', border: '1px solid #334b78', fontSize: 12 }}>{k}</span>
        ))}
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Controls">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <button onClick={() => action(() => startTrading())} disabled={operatorBusy || operator?.tradingEnabled === true}>Start</button>
            <button onClick={() => action(() => pauseTrading())} disabled={operatorBusy || operator?.tradingEnabled === false}>Pause</button>
            <button onClick={() => action(() => resetRisk())} disabled={operatorBusy}>Reset Risk</button>
            <button onClick={() => action(() => overrideRisk(15))} disabled={operatorBusy}>Override 15m</button>
            <button onClick={() => action(() => clearRiskOverride())} disabled={operatorBusy}>Clear Override</button>
          </div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Operator state: {operator?.tradingEnabled === false ? 'PAUSED' : 'LIVE'}</div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Risk block reason: {risk?.activeBlockReason || 'none'}</div>
          {operatorError ? <div style={{ marginTop: 6, color: '#ffb8b8', fontSize: 12 }}>{operatorError}</div> : null}
        </SectionCard>

        <SectionCard title="Runtime Payload">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#c7d6ef', fontSize: 12 }}>{JSON.stringify({ runtime, risk, operator, engine }, null, 2)}</pre>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Execution Transparency (latest)">
          {trace.length ? trace.slice(0, 12).map((t: any, i: number) => (
            <div key={i} style={{ fontSize: 12, marginBottom: 6, color: '#c7d6ef' }}>
              {t.symbol} · {t.variantId} · {String(t.side || '—').toUpperCase()} · {t.finalStatus}
            </div>
          )) : <div style={{ color: '#9cb1d3' }}>No pipeline events yet.</div>}
        </SectionCard>

        <SectionCard title="Alerts">
          {alerts.length ? alerts.slice(0, 16).map((a, i) => <div key={i} style={{ fontSize: 12 }}>{a?.source || 'alert'} · {a?.message || JSON.stringify(a)}</div>) : <div style={{ color: '#9cb1d3' }}>No alerts emitted.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default StatusPage;
