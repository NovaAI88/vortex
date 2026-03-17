import React, { useEffect, useMemo, useState } from 'react';
import { fetchOrderbook, fetchTrades, fetchStatus, fetchDecisions } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'Data unavailable');

const MarketTerminalPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const [s, ob, tr, dec] = await Promise.all([fetchStatus(), fetchOrderbook(), fetchTrades(), fetchDecisions()]);
        if (!mounted) return;
        setStatus(s);
        setOrderbook(ob && typeof ob === 'object' ? ob : null);
        setTrades(Array.isArray(tr) ? tr.filter(Boolean) : []);
        setDecisions(Array.isArray(dec) ? dec.filter(Boolean) : []);
        setError(null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Data unavailable');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    const t = setInterval(load, 2500);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  const bestBid = Number(orderbook?.bids?.[0]?.[0]);
  const bestAsk = Number(orderbook?.asks?.[0]?.[0]);
  const spread = Number.isFinite(bestBid) && Number.isFinite(bestAsk) ? bestAsk - bestBid : null;
  const latestPrice = useMemo(() => {
    if (Number.isFinite(bestBid) && Number.isFinite(bestAsk)) return (bestBid + bestAsk) / 2;
    const p = Number(trades?.[0]?.price);
    return Number.isFinite(p) ? p : null;
  }, [bestBid, bestAsk, trades]);

  return (
    <div>
      <PageHeaderBar
        title="Market Terminal"
        subtitle={loading ? 'Loading…' : 'Real backend order book, trades and decisions'}
        status={error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning'}
        statusLabel={error ? 'DISCONNECTED' : 'LIVE'}
        activeSymbol="BTCUSDT"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Latest Price" value={fmt(latestPrice)} />
        <KpiCard label="Best Bid" value={fmt(bestBid)} />
        <KpiCard label="Best Ask" value={fmt(bestAsk)} />
        <KpiCard label="Spread" value={fmt(spread)} />
        <KpiCard label="Trades" value={trades.length || 'Data unavailable'} />
        <KpiCard label="Decisions" value={decisions.length || 'Data unavailable'} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>{error}</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Order Book">
          {orderbook?.bids?.length || orderbook?.asks?.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>{(orderbook?.bids || []).slice(0, 10).map((b: any, i: number) => <div key={i}>{b?.[0] ?? 'Data unavailable'} · {b?.[1] ?? 'Data unavailable'}</div>)}</div>
              <div>{(orderbook?.asks || []).slice(0, 10).map((a: any, i: number) => <div key={i}>{a?.[0] ?? 'Data unavailable'} · {a?.[1] ?? 'Data unavailable'}</div>)}</div>
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>

        <SectionCard title="Latest Trades">
          {trades.length ? trades.slice(0, 14).map((t: any, i: number) => <div key={i}>{t?.symbol ?? 'Data unavailable'} · {String(t?.side || '—').toUpperCase()} · {fmt(t?.price)} · {fmt(t?.qty)}</div>) : <div style={{ color: '#9cb1d3' }}>Data unavailable</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default MarketTerminalPage;
