import React, { useEffect, useMemo, useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import HealthBadge from '../components/ui/HealthBadge';
import { fetchOrderbook, fetchTrades, fetchStatus } from '../api/apiClient';

const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

const MarketTerminalPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setError(null);
      if (!mounted) return;
      try {
        const [s, ob, tr] = await Promise.all([
          fetchStatus(),
          fetchOrderbook(),
          fetchTrades(),
        ]);

        if (!mounted) return;
        setStatus(s);
        setOrderbook(ob);
        setTrades(Array.isArray(tr) ? tr : []);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || 'Backend not connected');
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    const t = setInterval(load, 2500);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const bestBid = Number(orderbook?.bids?.[0]?.[0]);
  const bestAsk = Number(orderbook?.asks?.[0]?.[0]);
  const spread = Number.isFinite(bestBid) && Number.isFinite(bestAsk) ? bestAsk - bestBid : null;
  const latestPrice = useMemo(() => {
    if (Number.isFinite(bestBid) && Number.isFinite(bestAsk)) return (bestBid + bestAsk) / 2;
    const p = Number(trades?.[0]?.price);
    return Number.isFinite(p) ? p : null;
  }, [bestBid, bestAsk, trades]);

  const connectionLabel = error ? 'DISCONNECTED' : status?.status === 'ok' ? 'CONNECTED' : 'UNKNOWN';
  const connectionState = error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning';

  return (
    <div>
      <PageHeaderBar
        title="Market Terminal"
        subtitle={loading ? 'Loading market feeds…' : 'Truthful order book + trades from backend'}
        status={connectionState as any}
        statusLabel={connectionLabel}
        activeSymbol="BTCUSDT"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Connection" value={connectionLabel} tone={connectionState === 'healthy' ? 'positive' : 'negative'} />
        <KpiCard label="Latest Price" value={latestPrice !== null ? fmt(latestPrice) : 'No data'} />
        <KpiCard label="Best Bid" value={Number.isFinite(bestBid) ? fmt(bestBid) : 'No data'} />
        <KpiCard label="Best Ask" value={Number.isFinite(bestAsk) ? fmt(bestAsk) : 'No data'} />
        <KpiCard label="Spread" value={spread !== null ? fmt(spread) : 'No data'} />
        <KpiCard label="Trade Events" value={trades.length} />
      </KpiStrip>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14 }}>Backend not connected.</div> : null}
      {!error && !loading && !orderbook && !trades.length ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14 }}>No market data available.</div> : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 8 }}>
        <SectionCard title="Order Book" actionSlot={<HealthBadge state={orderbook?.source === 'live' ? 'healthy' : 'warning'} label={orderbook?.source ? String(orderbook.source).toUpperCase() : 'NO SOURCE'} />}>
          {orderbook?.bids?.length || orderbook?.asks?.length ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 12, color: '#8fd9b2', marginBottom: 6 }}>Bids</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
                  {(orderbook?.bids || []).slice(0, 8).map((b: any, i: number) => <div key={i}>{b?.[0] ?? '—'} · {b?.[1] ?? '—'}</div>)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: '#ffb6b6', marginBottom: 6 }}>Asks</div>
                <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
                  {(orderbook?.asks || []).slice(0, 8).map((a: any, i: number) => <div key={i}>{a?.[0] ?? '—'} · {a?.[1] ?? '—'}</div>)}
                </div>
              </div>
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No order book snapshot available.</div>}
        </SectionCard>

        <SectionCard title="Latest Trades">
          {trades.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {trades.slice(0, 14).map((t, i) => (
                <div key={i}>{t?.symbol || '—'} · {String(t?.side || '—').toUpperCase()} · qty {fmt(t?.qty)} · {fmt(t?.price)} · {t?.variantId || 'default'}</div>
              ))}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No trades available.</div>}
        </SectionCard>
      </div>
    </div>
  );
};

export default MarketTerminalPage;
