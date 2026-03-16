import React, { useEffect, useState } from 'react';
import { fetchRisks, fetchStatus } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const AlertsPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, rk] = await Promise.all([fetchStatus(), fetchRisks()]);
        if (!mounted) return;
        setStatus(s);
        setRisks(Array.isArray(rk) ? rk : []);
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

  const blocked = risks.filter((r) => r?.blockedBy || r?.approved === false).length;

  return (
    <div>
      <PageHeaderBar
        title="Alerts & Risk Terminal"
        subtitle={loading ? 'Loading…' : 'Risk/alert view from backend risk stream only'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'LIVE RISK'}
        activeSymbol="RISK"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Risk Events" value={risks.length} />
        <KpiCard label="Blocked" value={blocked} tone={blocked > 0 ? 'negative' : 'neutral'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}

      <SectionCard title="Live Risk Feed">
        {risks.length ? (
          <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
            {risks.slice(0, 16).map((r, i) => <div key={i}>{r.symbol || '—'} · {r.side || '—'} · {r.variantId || 'default'} · {r.blockedBy || (r.approved ? 'approved' : 'blocked')}</div>)}
          </div>
        ) : <div style={{ color: '#9cb1d3' }}>No alerts emitted.</div>}
      </SectionCard>
    </div>
  );
};

export default AlertsPage;
