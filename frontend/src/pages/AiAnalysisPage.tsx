import React, { useEffect, useMemo, useState } from 'react';
import AiPredictionPanel from '../components/AiPredictionPanel';
import ConfidenceMeter from '../components/ConfidenceMeter';
import { fetchSignals } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

const AiAnalysisPage: React.FC = () => {
  const [confidence, setConfidence] = useState<number | null>(null);
  const [reasoning, setReasoning] = useState<string>('');
  const [signals, setSignals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendDisconnected, setBackendDisconnected] = useState(false);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchSignals();
        if (!mounted) return;
        const arr = Array.isArray(data) ? data : [];
        const sig = arr[0];

        setSignals(arr);
        setConfidence(sig && typeof sig.confidence === 'number' ? sig.confidence : null);
        setReasoning(sig && typeof sig.rationale === 'string' ? sig.rationale : '');
        setBackendDisconnected(false);
      } catch {
        if (!mounted) return;
        setSignals([]);
        setConfidence(null);
        setReasoning('');
        setBackendDisconnected(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, []);

  const primary = signals[0] || null;
  const bias = primary?.signalType ? String(primary.signalType).toUpperCase() : 'N/A';
  const confidencePct = confidence !== null ? `${Math.round(confidence * 100)}%` : 'N/A';
  const activeModels = useMemo(() => {
    const ids = new Set(
      signals
        .map((s) => s?.strategyId || s?.source)
        .filter((v) => typeof v === 'string' && v.length > 0)
    );
    return ids.size || 0;
  }, [signals]);
  const signalCount = signals.length;
  const regime = confidence !== null ? (confidence >= 0.75 ? 'Trending' : confidence >= 0.45 ? 'Neutral' : 'Uncertain') : 'N/A';
  const lastUpdate = primary?.timestamp || 'N/A';
  const healthState = backendDisconnected ? 'critical' : confidence !== null ? (confidence >= 0.75 ? 'healthy' : confidence >= 0.45 ? 'warning' : 'critical') : 'info';

  return (
    <div>
      <PageHeaderBar
        title="AI Analysis Terminal"
        subtitle={backendDisconnected ? 'Backend not connected — showing safe fallback state' : 'Model reasoning, signal synthesis, and operator intelligence'}
        status={healthState as any}
        statusLabel={backendDisconnected ? 'BACKEND OFFLINE' : healthState === 'healthy' ? 'AI STABLE' : healthState === 'warning' ? 'AI WATCH' : healthState === 'critical' ? 'AI CAUTION' : 'AI INFO'}
        activeSymbol={primary?.symbol || 'MULTI-ASSET'}
        timestamp={lastUpdate !== 'N/A' ? lastUpdate : undefined}
      />

      <KpiStrip>
        <KpiCard label="Signal Bias" value={bias} />
        <KpiCard label="Confidence" value={confidencePct} tone={confidence !== null ? (confidence >= 0.6 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Active Models" value={activeModels || 'N/A'} />
        <KpiCard label="Signal Count" value={signalCount || 'N/A'} />
        <KpiCard label="Regime" value={regime} />
        <KpiCard label="Last Update" value={lastUpdate !== 'N/A' ? new Date(lastUpdate).toLocaleTimeString() : 'N/A'} />
      </KpiStrip>

      {backendDisconnected ? (
        <div className="ui-card" style={{ padding: 20, color: '#c7d5ee', marginBottom: 18 }}>
          <div style={{ fontWeight: 800, color: '#ffb5b5', marginBottom: 6 }}>Backend not connected</div>
          <div style={{ fontSize: 13 }}>No AI data available right now. Reconnect backend to restore live model signals.</div>
        </div>
      ) : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)' }}>
        <SectionCard title="Core AI Signal Overview">
          <AiPredictionPanel />
        </SectionCard>

        <SectionCard
          title="Confidence / Health Stack"
          actionSlot={<HealthBadge state={healthState as any} label={healthState === 'healthy' ? 'ROBUST' : healthState === 'warning' ? 'MONITOR' : healthState === 'critical' ? 'FRAGILE' : 'INFO'} />}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              {confidence !== null ? <ConfidenceMeter confidence={confidence} /> : <div style={{ color: '#9db0cf' }}>No confidence data available.</div>}
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div style={{ color: '#dce8ff', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>Operator Interpretation</div>
              <div style={{ color: '#bdd0ef', fontSize: 13, lineHeight: 1.5 }}>
                Primary bias: <b style={{ color: '#eaf1ff' }}>{bias}</b><br />
                Confidence state: <b style={{ color: '#eaf1ff' }}>{confidencePct}</b><br />
                Model pressure: <b style={{ color: '#eaf1ff' }}>{regime}</b>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="Model Reasoning / Feature Interpretation">
          <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
            <div style={{ color: '#aae3ff', fontSize: 14, fontWeight: 800, marginBottom: 8 }}>Reasoning</div>
            <div style={{ color: '#d5e3fb', fontSize: 13, lineHeight: 1.6 }}>
              {loading ? 'Loading…' : reasoning || <span style={{ color: '#757e94' }}>No reasoning available.</span>}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Supporting Intelligence / Scenario Context">
          <div style={{ display: 'grid', gap: 10, color: '#bdd0ef', fontSize: 13 }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div><b style={{ color: '#eaf1ff' }}>Base Case:</b> Trend continuation with moderate momentum expansion.</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#eaf1ff' }}>Bull Case:</b> Signal confirmation + rising confidence above 75%.</div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div><b style={{ color: '#eaf1ff' }}>Bear Case:</b> Confidence decay and reversal signal clustering.</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#eaf1ff' }}>Trigger Watch:</b> Divergence between rationale and live market behavior.</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="AI Market Interpretation"
          text="Current model blend indicates directional intent but with variable conviction. Treat confidence drift as a first-class signal for adjusting aggressiveness."
          source="AI synthesis layer"
        />
        <InsightCard
          title="Operator Action Guidance"
          text="Scale exposure only when confidence and rationale remain aligned across refresh cycles. If mismatch appears, reduce size and prioritize confirmation from supporting context."
          source="Operator protocol"
        />
      </div>
    </div>
  );
};

export default AiAnalysisPage;
