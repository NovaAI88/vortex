import React, { useEffect, useMemo, useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import { fetchSignals, fetchTrades, fetchStatus } from '../api/apiClient';

const SentimentPage: React.FC = () => {
  const [signals, setSignals] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, sig, tr] = await Promise.all([
          fetchStatus(),
          fetchSignals(),
          fetchTrades(),
        ]);
        if (!mounted) return;
        setStatus(s);
        setSignals(Array.isArray(sig) ? sig : []);
        setTrades(Array.isArray(tr) ? tr : []);
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

  const buySignals = useMemo(() => signals.filter((s) => s?.signalType === 'buy').length, [signals]);
  const sellSignals = useMemo(() => signals.filter((s) => s?.signalType === 'sell').length, [signals]);
  const buyTrades = useMemo(() => trades.filter((t) => t?.side === 'buy').length, [trades]);
  const sellTrades = useMemo(() => trades.filter((t) => t?.side === 'sell').length, [trades]);

  const tone = buySignals + buyTrades === 0 && sellSignals + sellTrades === 0
    ? 'No data'
    : buySignals + buyTrades > sellSignals + sellTrades
    ? 'Bullish'
    : sellSignals + sellTrades > buySignals + buyTrades
    ? 'Bearish'
    : 'Balanced';

  return (
    <div>
      <PageHeaderBar
        title="Sentiment Terminal"
        subtitle={loading ? 'Loading…' : 'Derived directly from live signals/trades'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'DATA-DRIVEN'}
        activeSymbol="MARKET"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Signal Buys" value={buySignals} />
        <KpiCard label="Signal Sells" value={sellSignals} />
        <KpiCard label="Executed Buys" value={buyTrades} />
        <KpiCard label="Executed Sells" value={sellTrades} />
        <KpiCard label="Sentiment Tone" value={tone} tone={tone === 'Bullish' ? 'positive' : tone === 'Bearish' ? 'negative' : 'neutral'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}
      {!error && !loading && !signals.length && !trades.length ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14 }}>No sentiment source data available yet.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Recent Signals Input">
          {signals.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {signals.slice(0, 8).map((s, i) => <div key={i}>{s.symbol} · {String(s.signalType || '—').toUpperCase()} · {s.variantId || 'default'}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No signals available.</div>}
        </SectionCard>
        <SectionCard title="Recent Execution Output">
          {trades.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {trades.slice(0, 8).map((t, i) => <div key={i}>{t.symbol} · {String(t.side || '—').toUpperCase()} · {t.variantId || 'default'}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No trades available.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default SentimentPage;
