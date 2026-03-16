import React, { useEffect, useMemo, useState } from 'react';
import { fetchStatus, fetchEngineStatus, fetchEngineRisk, fetchAlerts } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

const POLL_INTERVAL = 5000;

const StatusPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [engine, setEngine] = useState<any>(null);
  const [risk, setRisk] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async (initial = false) => {
      if (initial) setLoading(true);
      setError(null);
      try {
        const [statusRes, engineRes, riskRes, alertsRes] = await Promise.all([
          fetchStatus().catch(() => null),
          fetchEngineStatus().catch(() => null),
          fetchEngineRisk().catch(() => null),
          fetchAlerts().catch(() => []),
        ]);

        if (!mounted) return;
        setStatus(statusRes);
        setEngine(engineRes);
        setRisk(riskRes);
        setAlerts(Array.isArray(alertsRes) ? alertsRes : []);
      } catch (err) {
        if (mounted) setError(String(err));
      } finally {
        if (mounted && initial) setLoading(false);
      }
    };

    load(true);
    const tid = setInterval(() => load(false), POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(tid);
    };
  }, []);

  const serviceState = useMemo(() => {
    const s = String(status?.status || '').toLowerCase();
    if (s === 'ok' || s === 'running') return 'healthy';
    if (!status) return 'info';
    return 'warning';
  }, [status]);

  const riskState = useMemo(() => {
    if (!risk) return 'info';
    if (risk.killSwitch) return 'critical';
    if (risk.tradingAllowed === false) return 'warning';
    return 'healthy';
  }, [risk]);

  const uptimeSeconds = typeof status?.uptime === 'number' ? status.uptime : null;
  const build = status?.build || 'N/A';
  const engineStatus = engine?.status || 'N/A';
  const riskLabel = risk?.killSwitch ? 'KILL SWITCH' : risk?.tradingAllowed === false ? 'RESTRICTED' : 'NORMAL';
  const lastUpdate = status?.timestamp || engine?.timestamp || status?.time || 'N/A';

  if (loading) return <div style={{ padding: 60, color: '#7ec4ee' }}>Loading status terminal…</div>;

  return (
    <div>
      <PageHeaderBar
        title="System Status Terminal"
        subtitle="Backend health, runtime stability, and service monitoring"
        status={serviceState as any}
        statusLabel={status?.status ? String(status.status).toUpperCase() : 'MONITORING'}
        activeSymbol="SYSTEM"
        timestamp={lastUpdate}
      />

      <KpiStrip>
        <KpiCard label="Service Status" value={status?.status || 'N/A'} tone={serviceState === 'healthy' ? 'positive' : 'neutral'} />
        <KpiCard label="Uptime" value={uptimeSeconds != null ? `${uptimeSeconds.toFixed(1)}s` : 'N/A'} />
        <KpiCard label="Build" value={build} />
        <KpiCard label="Engine Status" value={engineStatus} tone={String(engineStatus).toLowerCase() === 'ok' ? 'positive' : 'neutral'} />
        <KpiCard label="Risk State" value={riskLabel} tone={riskState === 'critical' ? 'negative' : riskState === 'healthy' ? 'positive' : 'neutral'} />
        <KpiCard label="Last Update" value={lastUpdate !== 'N/A' ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 380px)' }}>
        <SectionCard
          title="Backend Service Overview"
          actionSlot={<HealthBadge state={serviceState as any} label={serviceState === 'healthy' ? 'HEALTHY' : 'DEGRADED'} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#bdd0ef', fontSize: 13 }}><b style={{ color: '#e8f1ff' }}>Service:</b> {status?.service || 'AETHER backend'}</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, marginTop: 6 }}><b style={{ color: '#e8f1ff' }}>Status:</b> {status?.status || 'N/A'}</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, marginTop: 6 }}><b style={{ color: '#e8f1ff' }}>Timestamp:</b> {status?.timestamp || status?.time || 'N/A'}</div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#bdd0ef', fontSize: 13 }}><b style={{ color: '#e8f1ff' }}>Error Channel:</b> {error ? error : 'No active error'}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Engine / Runtime Health"
          actionSlot={<HealthBadge state={riskState as any} label={riskLabel} />}
        >
          <div style={{ display: 'grid', gap: 8, color: '#bdd0ef', fontSize: 13 }}>
            <div><b style={{ color: '#e8f1ff' }}>Engine:</b> {engine?.status || 'N/A'}</div>
            <div><b style={{ color: '#e8f1ff' }}>Mode:</b> {engine?.mode || 'N/A'}</div>
            <div><b style={{ color: '#e8f1ff' }}>Trading Allowed:</b> {risk?.tradingAllowed === undefined ? 'N/A' : risk.tradingAllowed ? 'Yes' : 'No'}</div>
            <div><b style={{ color: '#e8f1ff' }}>Kill Switch:</b> {risk?.killSwitch === undefined ? 'N/A' : risk.killSwitch ? 'ACTIVE' : 'Off'}</div>
            <div><b style={{ color: '#e8f1ff' }}>Max Drawdown:</b> {risk?.maxDrawdownPercent ?? 'N/A'}%</div>
            <div><b style={{ color: '#e8f1ff' }}>Daily Loss Limit:</b> {risk?.dailyLossLimitPercent ?? 'N/A'}%</div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="API / Monitoring Details">
          <div style={{ display: 'grid', gap: 8, color: '#bdd0ef', fontSize: 13 }}>
            <div><b style={{ color: '#e8f1ff' }}>API Base:</b> http://localhost:3000</div>
            <div><b style={{ color: '#e8f1ff' }}>Polling Interval:</b> {POLL_INTERVAL / 1000}s</div>
            <div><b style={{ color: '#e8f1ff' }}>Build:</b> {build}</div>
            <div><b style={{ color: '#e8f1ff' }}>Last Update:</b> {lastUpdate}</div>
          </div>
        </SectionCard>

        <SectionCard title="Warnings / Incidents / Alerts Summary">
          {alerts.length === 0 ? (
            <div style={{ color: '#9db0cf', fontSize: 13 }}>No active alerts in feed.</div>
          ) : (
            <div style={{ display: 'grid', gap: 7 }}>
              {alerts.slice(0, 6).map((a: any, i: number) => (
                <div key={i} className="ui-card" style={{ marginBottom: 0, padding: '10px 12px' }}>
                  <div style={{ color: '#e8f1ff', fontSize: 13, fontWeight: 700 }}>{a.type || a.level || 'Alert'}</div>
                  <div style={{ color: '#bdd0ef', fontSize: 12, marginTop: 4 }}>{a.message || JSON.stringify(a)}</div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="AI Runtime Interpretation"
          text="Core backend and engine channels are stable. Continue monitoring risk flags and alert feed density to detect early degradation before execution quality is impacted."
          source="Runtime intelligence layer"
        />
        <InsightCard
          title="Operator Action Guidance"
          text="If status degrades or kill switch activates, pause strategy scaling, inspect engine/risk endpoints, and validate ingestion continuity before restoring normal operations."
          source="Operator protocol"
        />
      </div>
    </div>
  );
};

export default StatusPage;
