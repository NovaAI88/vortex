import React, { useEffect, useMemo, useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import { fetchOrderbook, fetchTrades, fetchStatus } from '../api/apiClient';

const TechnicalAnalysisPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setError(null);
      try {
        const [s, ob, tr] = await Promise.all([fetchStatus(), fetchOrderbook(), fetchTrades()]);
        if (!mounted) return;
        setStatus(s);
        setOrderbook(ob);
        setTrades(Array.isArray(tr) ? tr.filter(Boolean) : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Backend not connected');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 3000);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const bestBid = Number(orderbook?.bids?.[0]?.[0]);
  const bestAsk = Number(orderbook?.asks?.[0]?.[0]);
  const spread = Number.isFinite(bestBid) && Number.isFinite(bestAsk) ? bestAsk - bestBid : null;
  const lastTradePrice = Number(trades?.[0]?.price);
  const microTrend = useMemo(() => {
    if (trades.length < 2) return 'No data';
    const now = Number(trades[0]?.price);
    const prev = Number(trades[1]?.price);
    if (!Number.isFinite(now) || !Number.isFinite(prev)) return 'No data';
    return now > prev ? 'Up' : now < prev ? 'Down' : 'Flat';
  }, [trades]);

  return (
    <div>
      <PageHeaderBar
        title="Technical Analysis Terminal"
        subtitle={loading ? 'Loading…' : 'Real-time microstructure from backend order book/trades'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'LIVE INPUT'}
        activeSymbol="BTCUSDT"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Best Bid" value={Number.isFinite(bestBid) ? bestBid.toFixed(2) : 'No data'} />
        <KpiCard label="Best Ask" value={Number.isFinite(bestAsk) ? bestAsk.toFixed(2) : 'No data'} />
        <KpiCard label="Spread" value={spread !== null ? spread.toFixed(2) : 'No data'} />
        <KpiCard label="Last Trade" value={Number.isFinite(lastTradePrice) ? lastTradePrice.toFixed(2) : 'No data'} />
        <KpiCard label="Micro Trend" value={microTrend} tone={microTrend === 'Up' ? 'positive' : microTrend === 'Down' ? 'negative' : 'neutral'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}
      {!error && !loading && !orderbook && !trades.length ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14 }}>No technical data available yet.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Order Book Depth">
          {orderbook?.bids?.length || orderbook?.asks?.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              <div>Top bids: {(orderbook?.bids || []).slice(0, 4).map((b: any) => `${b[0]}(${b[1]})`).join(' · ')}</div>
              <div>Top asks: {(orderbook?.asks || []).slice(0, 4).map((a: any) => `${a[0]}(${a[1]})`).join(' · ')}</div>
              <div>Support: {orderbook?.support ?? '—'} | Resistance: {orderbook?.resistance ?? '—'}</div>
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No order book data.</div>}
        </SectionCard>

        <SectionCard title="Recent Prints">
          {trades.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              {trades.slice(0, 10).map((t, i) => <div key={i}>{t?.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '—'} · {String(t?.side || '—').toUpperCase()} · {t?.price ?? '—'} · qty {t?.qty ?? '—'}</div>)}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No trade prints.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default TechnicalAnalysisPage;
