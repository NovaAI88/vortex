import React, { useEffect, useState } from 'react';
import { fetchStatus, fetchSignals } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const NewsIntelligencePage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, sig] = await Promise.all([fetchStatus(), fetchSignals()]);
        if (!mounted) return;
        setStatus(s);
        setSignals(Array.isArray(sig) ? sig.filter(Boolean) : []);
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
        subtitle={loading ? 'Loading…' : 'No dedicated news feed endpoint wired yet'}
        status={error ? 'critical' : status?.status === 'ok' ? 'warning' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'INACTIVE'}
        activeSymbol="NEWS"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Feed State" value={error ? 'Disconnected' : 'Not connected yet'} tone={error ? 'negative' : 'neutral'} />
        <KpiCard label="Signals Observed" value={signals.length} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}
      <SectionCard title="Truthful State">
        <div style={{ color: '#9cb1d3', fontSize: 13 }}>
          INACTIVE: backend endpoint for dedicated news feed is missing (expected something like `/api/news`). This page intentionally shows no fabricated headlines or sentiment cards.
        </div>
      </SectionCard>
    </div>
  );
};

export default NewsIntelligencePage;
