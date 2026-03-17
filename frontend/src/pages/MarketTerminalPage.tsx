import React, { useEffect, useMemo, useState } from 'react';
import { fetchOrderbook, fetchTrades, fetchStatus, fetchDecisions } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';

const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

const MarketTerminalPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string>('');

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
        setFetchedAt(new Date().toISOString());
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
        <KpiCard label="Trades" value={trades.length} />
        <KpiCard label="Decisions" value={decisions.length} />
      </KpiStrip>

      <div className="ui-card" style={{ marginTop: 8, fontSize: 12, color: '#a8bbdb', padding: 8 }}>
        Book fetched: {fetchedAt ? new Date(fetchedAt).toLocaleTimeString() : '—'}
      </div>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>{error}</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Order Book Ladder">
          {orderbook?.bids?.length || orderbook?.asks?.length ? (
            <table className="ui-table" style={{ width: '100%' }}>
              <thead><tr><th>Bid Px</th><th>Bid Qty</th><th>Ask Px</th><th>Ask Qty</th></tr></thead>
              <tbody>
                {Array.from({ length: 12 }).map((_, i) => {
                  const b = orderbook?.bids?.[i] || [];
                  const a = orderbook?.asks?.[i] || [];
                  return <tr key={i}><td>{b?.[0] ?? '—'}</td><td>{b?.[1] ?? '—'}</td><td>{a?.[0] ?? '—'}</td><td>{a?.[1] ?? '—'}</td></tr>;
                })}
              </tbody>
            </table>
          ) : <div style={{ color: '#9cb1d3' }}>No order book data</div>}
        </SectionCard>

        <SectionCard title="Latest Trades">
          {trades.length ? (
            <table className="ui-table" style={{ width: '100%' }}>
              <thead><tr><th>Time</th><th>Side</th><th>Price</th><th>Qty</th><th>Status</th></tr></thead>
              <tbody>
                {trades.slice(0, 14).map((t: any, i: number) => (
                  <tr key={i}>
                    <td>{t?.timestamp ? new Date(t.timestamp).toLocaleTimeString() : '—'}</td>
                    <td>{String(t?.side || '—').toUpperCase()}</td>
                    <td>{fmt(Number(t?.price))}</td>
                    <td>{fmt(Number(t?.qty))}</td>
                    <td>{t?.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <div style={{ color: '#9cb1d3' }}>No trades yet</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default MarketTerminalPage;
