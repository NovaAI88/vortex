import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchSystemStatus,
  startTrading,
  pauseTrading,
  resetRisk,
  overrideRisk,
  clearRiskOverride,
} from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const fmt = (v: any, digits = 2) => {
  if (typeof v !== 'number' || !Number.isFinite(v)) return '—';
  return v.toLocaleString(undefined, { maximumFractionDigits: digits });
};

const healthTone = (state: string) => {
  if (state === 'HEALTHY') return 'positive';
  if (state === 'DEGRADED') return 'warning';
  if (state === 'BLOCKED' || state === 'PAUSED') return 'negative';
  return 'neutral';
};

const OperatorConsolePage: React.FC = () => {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = async (mounted = true) => {
    try {
      const data = await fetchSystemStatus();
      if (!mounted) return;
      setSnapshot(data && typeof data === 'object' ? data : null);
      setError(null);
    } catch (e: any) {
      if (!mounted) return;
      setError(e?.message || 'Backend not connected');
      setSnapshot(null);
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load(mounted);
    const t = setInterval(() => load(mounted), 5000);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const runAction = async (fn: () => Promise<any>) => {
    setActionBusy(true);
    setActionError(null);
    try {
      await fn();
      await load(true);
    } catch (e: any) {
      setActionError(e?.message || 'Control action failed');
    } finally {
      setActionBusy(false);
    }
  };

  const systemHealth = snapshot?.systemHealth || 'UNKNOWN';
  const runtimeLabel = error ? 'DISCONNECTED' : systemHealth;

  const riskFlags = useMemo(() => {
    const flags: string[] = [];
    const riskFlagsRaw = Array.isArray(snapshot?.aiResearch?.riskFlags) ? snapshot.aiResearch.riskFlags : [];
    riskFlagsRaw.forEach((flag: any) => {
      if (typeof flag === 'string' && flag.trim()) flags.push(flag.trim());
    });
    if (snapshot?.risk?.activeBlockReason) flags.unshift(`Risk block: ${snapshot.risk.activeBlockReason}`);
    if (snapshot?.operator?.tradingEnabled === false) flags.unshift('Operator pause active');
    return flags.slice(0, 6);
  }, [snapshot]);

  return (
    <div>
      <PageHeaderBar
        title="Operator Console"
        subtitle={loading ? 'Loading…' : 'Unified oversight for verification, research, and decision safety'}
        status={error ? 'critical' : systemHealth === 'HEALTHY' ? 'healthy' : systemHealth === 'DEGRADED' ? 'warning' : 'critical'}
        statusLabel={runtimeLabel}
        activeSymbol="VORTEX"
        timestamp={snapshot?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="System Health" value={systemHealth} tone={healthTone(systemHealth) as any} />
        <KpiCard label="Trading Allowed" value={snapshot?.tradingAllowed ? 'Yes' : 'No'} tone={snapshot?.tradingAllowed ? 'positive' : 'negative'} />
        <KpiCard label="Engine Mode" value={snapshot?.engine?.mode || '—'} />
        <KpiCard label="Kill Switch" value={snapshot?.risk?.killSwitch ? 'ON' : 'OFF'} tone={snapshot?.risk?.killSwitch ? 'negative' : 'positive'} />
        <KpiCard label="Drawdown %" value={fmt(snapshot?.risk?.drawdownPercent)} tone={Number(snapshot?.risk?.drawdownPercent || 0) >= 0 ? 'negative' : 'neutral'} />
        <KpiCard label="AI Research" value={snapshot?.aiResearch?.status || (snapshot?.aiResearch?.available === false ? 'UNAVAILABLE' : '—')} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Operator Controls">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
            <button onClick={() => runAction(() => startTrading())} disabled={actionBusy || snapshot?.operator?.tradingEnabled === true}>Start</button>
            <button onClick={() => runAction(() => pauseTrading())} disabled={actionBusy || snapshot?.operator?.tradingEnabled === false}>Pause</button>
            <button onClick={() => runAction(() => resetRisk())} disabled={actionBusy}>Reset Risk</button>
            <button onClick={() => runAction(() => overrideRisk(15))} disabled={actionBusy}>Override 15m</button>
            <button onClick={() => runAction(() => clearRiskOverride())} disabled={actionBusy}>Clear Override</button>
          </div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Operator state: {snapshot?.operator?.tradingEnabled === false ? 'PAUSED' : 'LIVE'}</div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Override active: {snapshot?.operator?.riskOverrideActive ? 'Yes' : 'No'}</div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Last operator action: {snapshot?.operator?.lastAction || '—'}</div>
          {actionError ? <div style={{ marginTop: 6, color: '#ffb8b8', fontSize: 12 }}>{actionError}</div> : null}
        </SectionCard>

        <SectionCard title="Decision Safety">
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>Trading allowed by risk: {snapshot?.risk?.tradingAllowed ? 'Yes' : 'No'}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>Active block reason: {snapshot?.risk?.activeBlockReason || 'none'}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>
            Circuit breaker: {snapshot?.circuitBreaker?.consecutiveLosses ?? '—'} / {snapshot?.circuitBreaker?.maxConsecutiveLosses ?? '—'} losses
          </div>
          <div style={{ fontSize: 12, color: '#c7d6ef' }}>Approaching breaker threshold: {snapshot?.circuitBreaker?.approachingThreshold ? 'Yes' : 'No'}</div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Research + Analysis">
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>AI regime: {snapshot?.aiAnalysis?.regime || '—'}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>AI confidence: {fmt(snapshot?.aiAnalysis?.confidence, 3)}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>Research status: {snapshot?.aiResearch?.status || '—'}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef' }}>Recommended action: {snapshot?.aiResearch?.recommendedAction || '—'}</div>
        </SectionCard>

        <SectionCard title="Portfolio + Monitoring">
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>Equity: {fmt(snapshot?.portfolio?.equity)}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>Open positions: {snapshot?.portfolio?.openPositionCount ?? '—'}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef', marginBottom: 6 }}>Position monitor running: {snapshot?.positionMonitor?.running ? 'Yes' : 'No'}</div>
          <div style={{ fontSize: 12, color: '#c7d6ef' }}>Monitor symbol: {snapshot?.positionMonitor?.monitoredSymbol || '—'}</div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Risk Flags">
          {riskFlags.length ? (
            riskFlags.map((flag, idx) => (
              <div key={`${flag}-${idx}`} style={{ fontSize: 12, marginBottom: 6, color: '#ffd8d8' }}>{flag}</div>
            ))
          ) : (
            <div style={{ color: '#9cb1d3' }}>No active risk flags.</div>
          )}
        </SectionCard>

        <SectionCard title="Recent Alerts">
          {Array.isArray(snapshot?.recentAlerts) && snapshot.recentAlerts.length ? (
            snapshot.recentAlerts.slice(0, 12).map((a: any, i: number) => (
              <div key={i} style={{ fontSize: 12, marginBottom: 6, color: '#c7d6ef' }}>
                {(a?.source || 'alert').toString()} · {(a?.message || JSON.stringify(a)).toString()}
              </div>
            ))
          ) : (
            <div style={{ color: '#9cb1d3' }}>No alerts emitted.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default OperatorConsolePage;
