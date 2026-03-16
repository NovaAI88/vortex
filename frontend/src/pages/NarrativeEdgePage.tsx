import React, { useEffect, useState } from 'react';
import { fetchStatus, fetchSignals, fetchDecisions } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const NarrativeEdgePage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, sig, dec] = await Promise.all([fetchStatus(), fetchSignals(), fetchDecisions()]);
        if (!mounted) return;
        setStatus(s);
        setSignals(Array.isArray(sig) ? sig : []);
        setDecisions(Array.isArray(dec) ? dec : []);
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
        subtitle={loading ? 'Loading…' : 'Narrative engine not wired yet; showing only backend telemetry context'}
        status={error ? 'critical' : 'info'}
        statusLabel={error ? 'DISCONNECTED' : 'NOT WIRED'}
        activeSymbol="NARRATIVE"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Narrative Feed" value={error ? 'Disconnected' : 'Not connected yet'} tone={error ? 'negative' : 'neutral'} />
        <KpiCard label="Signals" value={signals.length} />
        <KpiCard label="Decisions" value={decisions.length} />
      </KpiStrip>

      <SectionCard title="Truthful State">
        <div style={{ color: '#9cb1d3', fontSize: 13 }}>
          Narrative engine not wired yet. No fabricated macro stories or synthetic narrative scoring is displayed.
        </div>
      </SectionCard>
    </div>
  );
};

export default NarrativeEdgePage;
