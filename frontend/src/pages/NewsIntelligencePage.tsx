import React, { useEffect, useState } from 'react';
import { fetchStatus, fetchSignals, fetchAiResearch } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const NewsIntelligencePage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [research, setResearch] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, sig, rs] = await Promise.all([fetchStatus(), fetchSignals(), fetchAiResearch().catch(() => null)]);
        if (!mounted) return;
        setStatus(s);
        setSignals(Array.isArray(sig) ? sig.filter(Boolean) : []);
        setResearch(rs && typeof rs === 'object' ? rs : null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Backend not connected');
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
        title="News Intelligence Terminal"
        subtitle={loading ? 'Loading…' : 'Real AI research output + signal telemetry'}
        status={error ? 'critical' : research?.available ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : research?.available ? 'LIVE' : 'WARMING'}
        activeSymbol="NEWS"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Research" value={error ? 'Disconnected' : research?.available ? (research?.report?.status || 'available') : 'Unavailable'} tone={error ? 'negative' : research?.available ? 'positive' : 'neutral'} />
        <KpiCard label="Action" value={research?.report?.recommendedAction || 'observe'} />
        <KpiCard label="Signals Observed" value={signals.length} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Research Summary">
          <div style={{ color: '#c7d6ef', fontSize: 13, lineHeight: 1.6 }}>
            <div>summary: {research?.report?.summary || 'AI research not yet available'}</div>
            <div>interpretation: {research?.report?.marketInterpretation || 'Waiting for research snapshot.'}</div>
            <div>source: {research?.report?.source || research?.source || '—'}</div>
          </div>
        </SectionCard>

        <SectionCard title="Risk Flags">
          {Array.isArray(research?.report?.riskFlags) && research.report.riskFlags.length ? (
            research.report.riskFlags.slice(0, 8).map((flag: string, idx: number) => (
              <div key={`${flag}-${idx}`} style={{ color: '#ffd8d8', fontSize: 13, marginBottom: 6 }}>{flag}</div>
            ))
          ) : (
            <div style={{ color: '#9cb1d3', fontSize: 13 }}>No active research risk flags.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default NewsIntelligencePage;
