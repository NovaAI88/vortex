import React, { useEffect, useMemo, useState } from 'react';
import { fetchSignals, fetchDecisions, fetchRisks, fetchStatus, fetchRuntimeState, fetchPipelineTrace } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import HealthBadge from '../components/ui/HealthBadge';

const AiAnalysisPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [runtime, setRuntime] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [risks, setRisks] = useState<any[]>([]);
  const [trace, setTrace] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, rt, sig, dec, rk, tr] = await Promise.all([
          fetchStatus(),
          fetchRuntimeState().catch(() => null),
          fetchSignals(),
          fetchDecisions(),
          fetchRisks(),
          fetchPipelineTrace().catch(() => []),
        ]);
        if (!mounted) return;
        setStatus(s);
        setRuntime(rt);
        setSignals(Array.isArray(sig) ? sig.filter(Boolean) : []);
        setDecisions(Array.isArray(dec) ? dec.filter(Boolean) : []);
        setRisks(Array.isArray(rk) ? rk.filter(Boolean) : []);
        setTrace(Array.isArray(tr) ? tr.filter(Boolean) : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Backend not connected');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const latestSignal = signals[0] || null;
  const latestDecision = decisions[0] || null;
  const latestRisk = risks[0] || null;

  const avgConfidence = useMemo(() => {
    const vals = signals.map((s) => Number(s?.confidence)).filter((v) => Number.isFinite(v));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0) / vals.length;
  }, [signals]);

  const approvedDecisions = decisions.filter((d) => d?.approved).length;
  const blockedRisks = risks.filter((r) => !r?.approved || r?.blockedBy).length;
  const approvalRate = decisions.length ? (approvedDecisions / decisions.length) : 0;

  const byVariant = useMemo(() => {
    const m: Record<string, number> = {};
    signals.forEach((s: any) => {
      const k = s?.variantId || 'default';
      m[k] = (m[k] || 0) + 1;
    });
    return m;
  }, [signals]);

  return (
    <div>
      <PageHeaderBar
        title="AI Analysis Terminal"
        subtitle={loading ? 'Loading…' : 'Truthful model/risk/decision telemetry'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : (runtime?.runtimeState || 'LIVE')}
        activeSymbol={latestSignal?.symbol || 'MULTI-ASSET'}
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Signal Count" value={signals.length} />
        <KpiCard label="Avg Confidence" value={avgConfidence !== null ? `${(avgConfidence * 100).toFixed(1)}%` : 'No data'} tone={avgConfidence !== null ? (avgConfidence >= 0.7 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Decisions" value={decisions.length} />
        <KpiCard label="Approved" value={approvedDecisions} tone="positive" />
        <KpiCard label="Approval Rate" value={`${(approvalRate * 100).toFixed(1)}%`} />
        <KpiCard label="Risk Blocks" value={blockedRisks} tone={blockedRisks > 0 ? 'negative' : 'neutral'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Latest Signal" actionSlot={<HealthBadge state={latestSignal ? 'healthy' : 'info'} label={latestSignal ? 'ACTIVE' : 'EMPTY'} />}>
          {latestSignal ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              <div>symbol: {latestSignal.symbol || '—'}</div>
              <div>side: {String(latestSignal.signalType || '—').toUpperCase()}</div>
              <div>variant: {latestSignal.variantId || 'default'}</div>
              <div>confidence: {typeof latestSignal.confidence === 'number' ? (latestSignal.confidence * 100).toFixed(1) : '—'}%</div>
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No signal available.</div>}
        </SectionCard>

        <SectionCard title="Decision / Risk Summary">
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
            <div>latest approved decision: {decisions.find((d: any) => d?.approved)?.id || 'none'}</div>
            <div>latest blocked reason: {risks.find((r: any) => !r?.approved)?.blockedBy || 'none'}</div>
            <div>latest risk blockedBy: {latestRisk?.blockedBy || '—'}</div>
            <div>latest decision side: {latestDecision?.side || '—'}</div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Signal Breakdown by Variant">
          {Object.keys(byVariant).length ? Object.entries(byVariant).map(([k, v]) => (
            <div key={k} style={{ fontSize: 12, color: '#c7d6ef' }}>{k}: {v}</div>
          )) : <div style={{ color: '#9cb1d3' }}>No variant data yet.</div>}
        </SectionCard>

        <SectionCard title="Last Pipeline Event">
          {trace[0] ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              <div>signal: {trace[0].signalId}</div>
              <div>strategy: {trace[0].strategyId} / {trace[0].variantId}</div>
              <div>status: {trace[0].finalStatus}</div>
              <div>reason: {trace[0]?.risk?.reason || trace[0]?.execution?.reason || '—'}</div>
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No pipeline event yet.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default AiAnalysisPage;
