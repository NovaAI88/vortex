import React, { useEffect, useState } from 'react';
import { fetchStatus, fetchEngineStatus, fetchEngineRisk, fetchAlerts } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const StatusPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [engine, setEngine] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, e, r, a] = await Promise.all([
          fetchStatus(),
          fetchEngineStatus().catch(() => null),
          fetchEngineRisk().catch(() => null),
          fetchAlerts().catch(() => []),
        ]);
        if (!mounted) return;
        setStatus(s);
        setEngine(e);
        setRisk(r);
        setAlerts(Array.isArray(a) ? a : []);
      } catch (err: any) {
        if (!mounted) return;
        setError(err?.message || 'Backend not connected');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

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
        <KpiCard label="Kill Switch" value={typeof risk?.killSwitch === 'boolean' ? (risk.killSwitch ? 'ON' : 'OFF') : 'No data'} tone={risk?.killSwitch ? 'negative' : 'neutral'} />
        <KpiCard label="Alerts" value={alerts.length} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Status Payload">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#c7d6ef', fontSize: 12 }}>{status ? JSON.stringify(status, null, 2) : 'No status payload.'}</pre>
        </SectionCard>
        <SectionCard title="Engine/Risk Payload">
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#c7d6ef', fontSize: 12 }}>{JSON.stringify({ engine, risk }, null, 2)}</pre>
        </SectionCard>
      </div>
    </div>
  );
};

export default StatusPage;
