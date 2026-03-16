import React, { useEffect, useMemo, useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import HealthBadge from '../components/ui/HealthBadge';
import { fetchOrderbook, fetchTrades, fetchStatus, fetchOperatorState, startTrading, pauseTrading } from '../api/apiClient';

const fmt = (v: any) => (typeof v === 'number' && Number.isFinite(v) ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

const MarketTerminalPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [operator, setOperator] = useState<any>(null);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  const load = async (mounted = true) => {
    setError(null);
    if (!mounted) return;
    try {
      const [s, op, ob, tr] = await Promise.all([
        fetchStatus(),
        fetchOperatorState().catch(() => null),
        fetchOrderbook(),
        fetchTrades(),
      ]);

      if (!mounted) return;
      setStatus(s);
      setOperator(op && typeof op === 'object' ? op : null);
      setOrderbook(ob && typeof ob === 'object' ? ob : null);
      setTrades(Array.isArray(tr) ? tr.filter(Boolean) : []);
    } catch (e: any) {
      if (!mounted) return;
      setError(e?.message || 'Backend not connected');
    } finally {
      if (mounted) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    load(mounted);
    const t = setInterval(() => load(mounted), 2500);
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const onStart = async () => {
    setOperatorBusy(true);
    setOperatorError(null);
    try {
      const next = await startTrading();
      setOperator(next);
    } catch (e: any) {
      setOperatorError(e?.message || 'Failed to start trading');
    } finally {
      setOperatorBusy(false);
    }
  };

  const onPause = async () => {
    setOperatorBusy(true);
    setOperatorError(null);
    try {
      const next = await pauseTrading();
      setOperator(next);
    } catch (e: any) {
      setOperatorError(e?.message || 'Failed to pause trading');
    } finally {
      setOperatorBusy(false);
    }
  };

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
  const tradingEnabled = operator?.tradingEnabled;

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
        <KpiCard label="Trading State" value={tradingEnabled === true ? 'LIVE' : tradingEnabled === false ? 'PAUSED' : 'No data'} tone={tradingEnabled === true ? 'positive' : tradingEnabled === false ? 'negative' : 'neutral'} />
        <KpiCard label="Latest Price" value={latestPrice !== null ? fmt(latestPrice) : 'No data'} />
        <KpiCard label="Best Bid" value={Number.isFinite(bestBid) ? fmt(bestBid) : 'No data'} />
        <KpiCard label="Best Ask" value={Number.isFinite(bestAsk) ? fmt(bestAsk) : 'No data'} />
        <KpiCard label="Spread" value={spread !== null ? fmt(spread) : 'No data'} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1.2fr 1fr', marginTop: 8 }}>
        <SectionCard title="Main Visual Panel (Order Book)" actionSlot={<HealthBadge state={orderbook?.source === 'live' ? 'healthy' : 'warning'} label={orderbook?.source ? String(orderbook.source).toUpperCase() : 'NO SOURCE'} />}>
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

        <SectionCard title="Side Insights / Operator State">
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button onClick={onStart} disabled={operatorBusy || tradingEnabled === true} style={{ background: '#1e2d45', color: '#dff6ff', border: '1px solid #35507a', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Start</button>
            <button onClick={onPause} disabled={operatorBusy || tradingEnabled === false} style={{ background: '#3a1f2a', color: '#ffdede', border: '1px solid #7b3f4f', borderRadius: 8, padding: '6px 10px', cursor: 'pointer' }}>Pause</button>
          </div>
          <div style={{ fontSize: 12, color: '#bcd0ef' }}>Last updated: {operator?.lastUpdated ? new Date(operator.lastUpdated).toLocaleString() : 'No data'}</div>
          {operatorError ? <div style={{ marginTop: 6, color: '#ffb8b8', fontSize: 12 }}>{operatorError}</div> : null}
          {tradingEnabled === false ? <div style={{ marginTop: 8, color: '#ffb8b8', fontSize: 12, fontWeight: 700 }}>PAUSED MODE — market data remains visible.</div> : null}
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr', marginTop: 8 }}>
        <SectionCard title="Detail / Feed Panel (Latest Trades)">
          {trades.length ? (
            <div style={{ fontSize: 12, lineHeight: 1.6, color: '#c7d6ef' }}>
              {trades.slice(0, 14).map((t, i) => (
                <div key={i}>{t?.symbol || '—'} · {String(t?.side || '—').toUpperCase()} · qty {fmt(t?.qty)} · {fmt(t?.price)} · {t?.variantId || 'default'}</div>
              ))}
            </div>
          ) : <div style={{ color: '#9cb1d3' }}>No trades available.</div>}
        </SectionCard>
      </div>

      {error ? <div className="ui-card" style={{ color: '#ffb8b8', padding: 14, marginTop: 10 }}>Backend not connected.</div> : null}
      {!error && !loading && !orderbook && !trades.length ? <div className="ui-card" style={{ color: '#9cb1d3', padding: 14, marginTop: 10 }}>No market data available.</div> : null}
    </div>
  );
};

export default MarketTerminalPage;
