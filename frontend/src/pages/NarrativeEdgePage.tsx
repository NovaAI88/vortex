import React, { useEffect, useState } from 'react';
import { fetchStatus, fetchSignals, fetchDecisions, fetchAiAnalysis } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const NarrativeEdgePage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, sig, dec, an] = await Promise.all([fetchStatus(), fetchSignals(), fetchDecisions(), fetchAiAnalysis().catch(() => null)]);
        if (!mounted) return;
        setStatus(s);
        setSignals(Array.isArray(sig) ? sig.filter(Boolean) : []);
        setDecisions(Array.isArray(dec) ? dec.filter(Boolean) : []);
        setAnalysis(an && typeof an === 'object' ? an : null);
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
        title="Narrative Edge Terminal"
        subtitle={loading ? 'Loading…' : 'Real AI regime analysis + decision context'}
        status={error ? 'critical' : analysis?.available ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : analysis?.available ? 'LIVE' : 'WARMING'}
        activeSymbol="NARRATIVE"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Regime" value={analysis?.regime || 'Unavailable'} tone={analysis?.regime === 'HIGH_RISK' ? 'negative' : 'neutral'} />
        <KpiCard label="Bias" value={analysis?.bias || 'Unavailable'} />
        <KpiCard label="Confidence" value={typeof analysis?.confidence === 'number' ? `${(analysis.confidence * 100).toFixed(1)}%` : 'Unavailable'} tone={typeof analysis?.confidence === 'number' && analysis.confidence >= 0.7 ? 'positive' : 'neutral'} />
        <KpiCard label="Signals" value={signals.length} />
        <KpiCard label="Decisions" value={decisions.length} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Analysis Snapshot">
          <div style={{ color: '#c7d6ef', fontSize: 13, lineHeight: 1.6 }}>
            <div>regime: {analysis?.regime || 'Unavailable'}</div>
            <div>bias: {analysis?.bias || 'Unavailable'}</div>
            <div>volatility: {typeof analysis?.volatilityLevel === 'number' ? analysis.volatilityLevel.toFixed(3) : 'Unavailable'}</div>
            <div>leverage band: {analysis?.leverageBand || 'Unavailable'}</div>
          </div>
        </SectionCard>

        <SectionCard title="Rationale">
          {Array.isArray(analysis?.rationale) && analysis.rationale.length ? (
            analysis.rationale.slice(0, 6).map((line: string, idx: number) => (
              <div key={`${line}-${idx}`} style={{ color: '#c7d6ef', fontSize: 13, marginBottom: 6 }}>{line}</div>
            ))
          ) : (
            <div style={{ color: '#9cb1d3', fontSize: 13 }}>No AI rationale emitted yet.</div>
          )}
        </SectionCard>
      </div>
    </div>
  );
};

export default NarrativeEdgePage;
