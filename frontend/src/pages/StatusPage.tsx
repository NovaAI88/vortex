import React, { useEffect, useState } from 'react';
import { fetchStatus, fetchEngineStatus, fetchEngineRisk, fetchAlerts, fetchOperatorState, startTrading, pauseTrading } from '../api/apiClient';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const load = async (mounted = true) => {
    setError(null);
    try {
      const [s, e, r, a, op] = await Promise.all([
        fetchStatus(),
        fetchEngineStatus().catch(() => null),
        fetchEngineRisk().catch(() => null),
        fetchAlerts().catch(() => []),
        fetchOperatorState().catch(() => null),
      ]);
      if (!mounted) return;
      setStatus(s);
      setEngine(e);
      setRisk(r);
      setAlerts(Array.isArray(a) ? a.filter(Boolean) : []);
      setOperator(op && typeof op === 'object' ? op : null);
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

  const onStart = async () => {
    setOperatorBusy(true);
    setOperatorError(null);
    try {
      const next = await startTrading();
      setOperator(next);
    } catch (e: any) {
      setOperatorError(e?.message || 'Failed to start trading');
    } finally {
      setOperatorBusy(false);
    }
  };

  const onPause = async () => {
    setOperatorBusy(true);
    setOperatorError(null);
    try {
      const next = await pauseTrading();
      setOperator(next);
    } catch (e: any) {
      setOperatorError(e?.message || 'Failed to pause trading');
    } finally {
      setOperatorBusy(false);
    }
  };

  const tradingEnabled = operator?.tradingEnabled;

  return (
    <div>
      <PageHeaderBar
        title="System Status Terminal"
        subtitle={loading ? 'Loading…' : 'Runtime status based only on backend endpoints'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : String(status?.status || 'UNKNOWN').toUpperCase()}
        activeSymbol="SYSTEM"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Backend" value={status?.status || 'No data'} tone={status?.status === 'ok' ? 'positive' : 'neutral'} />
        <KpiCard label="Engine" value={engine?.status || 'No data'} />
        <KpiCard label="Mode" value={engine?.mode || 'No data'} />
        <KpiCard label="Trading Allowed" value={typeof risk?.tradingAllowed === 'boolean' ? (risk.tradingAllowed ? 'Yes' : 'No') : 'No data'} />
        <KpiCard label="Operator State" value={tradingEnabled === true ? 'LIVE' : tradingEnabled === false ? 'PAUSED' : 'No data'} tone={tradingEnabled === true ? 'positive' : tradingEnabled === false ? 'negative' : 'neutral'} />
        <KpiCard label="Alerts" value={alerts.length} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Metrics / Operator Control">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={onStart} disabled={operatorBusy || tradingEnabled === true} style={{ background: '#1e2d45', color: '#dff6ff', border: '1px solid #35507a', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Start</button>
            <button onClick={onPause} disabled={operatorBusy || tradingEnabled === false} style={{ background: '#3a1f2a', color: '#ffdede', border: '1px solid #7b3f4f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Pause</button>
          </div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Last updated: {operator?.lastUpdated ? new Date(operator.lastUpdated).toLocaleString() : 'No data'}</div>
          {operatorError ? <div style={{ marginTop: 6, color: '#ffb8b8', fontSize: 12 }}>{operatorError}</div> : null}
          {tradingEnabled === false ? <div style={{ marginTop: 8, color: '#ffb8b8', fontSize: 12, fontWeight: 700 }}>PAUSED MODE — clearly active at operator layer.</div> : null}
        </SectionCard>

        <SectionCard title="Main Visual / System Payloads">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#c7d6ef', fontSize: 12 }}>{JSON.stringify({ status, engine, risk, operator }, null, 2)}</pre>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr', marginTop: 10 }}>
        <SectionCard title="Detail / Feed Panel (Alerts)">
          {alerts.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {alerts.slice(0, 16).map((a, i) => <div key={i}>{a?.type || 'alert'} · {a?.message || JSON.stringify(a)}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No alerts emitted.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default StatusPage;
