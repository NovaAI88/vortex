import React, { useEffect, useMemo, useState } from 'react';
import {
  fetchStatus,
  fetchSignals,
  fetchDecisions,
  fetchTrades,
  fetchPortfolio,
  fetchOrderbook,
  fetchRisks,
  fetchPositions,
} from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import HealthBadge from '../components/ui/HealthBadge';

const fmt = (v: any) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : '—');

const DashboardPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [position, setPosition] = useState<any>(null);
  const [signals, setSignals] = useState<any[]>([]);
  const [decisions, setDecisions] = useState<any[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [orderbook, setOrderbook] = useState<any>(null);
  const [risks, setRisks] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, p, pos, sig, dec, tr, ob, rk] = await Promise.all([
          fetchStatus(),
          fetchPortfolio().catch(() => null),
          fetchPositions().catch(() => null),
          fetchSignals().catch(() => []),
          fetchDecisions().catch(() => []),
          fetchTrades().catch(() => []),
          fetchOrderbook().catch(() => null),
          fetchRisks().catch(() => []),
        ]);

        if (!mounted) return;
        setStatus(s);
        setPortfolio(p);
        setPosition(pos);
        setSignals(Array.isArray(sig) ? sig : []);
        setDecisions(Array.isArray(dec) ? dec : []);
        setTrades(Array.isArray(tr) ? tr : []);
        setOrderbook(ob);
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
    return () => {
      mounted = false;
      clearInterval(t);
    };
  }, []);

  const latestPrice = useMemo(() => {
    const bid = Number(orderbook?.bids?.[0]?.[0]);
    const ask = Number(orderbook?.asks?.[0]?.[0]);
    if (Number.isFinite(bid) && Number.isFinite(ask)) return (bid + ask) / 2;
    const tr = Number(trades?.[0]?.price);
    return Number.isFinite(tr) ? tr : null;
  }, [orderbook, trades]);

  const openPositions = Array.isArray(portfolio?.positions) ? portfolio.positions.length : 0;
  const health = error ? 'critical' : status?.status === 'ok' ? 'healthy' : 'warning';

  if (loading) return <div className="ui-card" style={{ color: '#9cb6d8', padding: 20 }}>Loading backend state…</div>;

  return (
    <div>
      <PageHeaderBar
        title="AETHER Dashboard"
        subtitle={error ? 'Backend disconnected — truthful fallback mode' : 'Compact live backend overview'}
        status={health as any}
        statusLabel={error ? 'DISCONNECTED' : status?.status ? String(status.status).toUpperCase() : 'UNKNOWN'}
        activeSymbol="BTCUSDT"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Backend Status" value={error ? 'Offline' : 'Live'} tone={error ? 'negative' : 'positive'} />
        <KpiCard label="BTC Price" value={latestPrice !== null ? fmt(latestPrice) : 'No data'} />
        <KpiCard label="Equity" value={portfolio ? fmt(portfolio.equity) : 'No data'} />
        <KpiCard label="Realized PnL" value={portfolio ? fmt(portfolio.pnl) : 'No data'} tone={typeof portfolio?.pnl === 'number' ? (portfolio.pnl >= 0 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Open Positions" value={openPositions} />
      </KpiStrip>

      {error ? (
        <div className="ui-card" style={{ padding: 16, color: '#ffc1c1', marginBottom: 12 }}>Backend not connected. Panels are showing only available persisted backend responses.</div>
      ) : null}

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', marginTop: 8 }}>
        <SectionCard title="Latest Signals" actionSlot={<HealthBadge state="info" label={`${signals.length} items`} />}>
          {signals.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              {signals.slice(0, 5).map((s, i) => (
                <div key={i}>{s.symbol} · {String(s.signalType || '—').toUpperCase()} · {s.variantId || 'default'} · conf {typeof s.confidence === 'number' ? (s.confidence * 100).toFixed(0) : '—'}%</div>
              ))}
            </div>
          ) : <div style={{ color: '#97a9c8' }}>No signals available.</div>}
        </SectionCard>

        <SectionCard title="Latest Decisions">
          {decisions.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              {decisions.slice(0, 5).map((d, i) => (
                <div key={i}>{d.symbol || '—'} · {d.side || '—'} · {d.variantId || 'default'} · {d.approved ? 'approved' : 'blocked'}</div>
              ))}
            </div>
          ) : <div style={{ color: '#97a9c8' }}>No decisions available.</div>}
        </SectionCard>

        <SectionCard title="Latest Trades">
          {trades.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              {trades.slice(0, 5).map((t, i) => (
                <div key={i}>{t.symbol} · {String(t.side || '—').toUpperCase()} · qty {fmt(t.qty)} · {fmt(t.price)}</div>
              ))}
            </div>
          ) : <div style={{ color: '#97a9c8' }}>No trades available.</div>}
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: 10 }}>
        <SectionCard title="Order Book / Market Snapshot">
          {orderbook?.bids?.length || orderbook?.asks?.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              <div>Best Bid: {orderbook?.bids?.[0]?.[0] ?? '—'} ({orderbook?.bids?.[0]?.[1] ?? '—'})</div>
              <div>Best Ask: {orderbook?.asks?.[0]?.[0] ?? '—'} ({orderbook?.asks?.[0]?.[1] ?? '—'})</div>
              <div>Support: {orderbook?.support ?? '—'}</div>
              <div>Resistance: {orderbook?.resistance ?? '—'}</div>
              <div>Source: {orderbook?.source || 'unknown'}</div>
            </div>
          ) : <div style={{ color: '#97a9c8' }}>No order book available.</div>}
        </SectionCard>

        <SectionCard title="Risk Summary">
          {risks.length ? (
            <div style={{ fontSize: 12, color: '#c7d6ef', lineHeight: 1.6 }}>
              {risks.slice(0, 5).map((r, i) => (
                <div key={i}>{r.symbol || '—'} · {r.side || '—'} · {r.blockedBy || (r.approved ? 'approved' : 'blocked')}</div>
              ))}
            </div>
          ) : <div style={{ color: '#97a9c8' }}>No risk records available.</div>}
        </SectionCard>
      </div>

      {position ? null : <div className="ui-card" style={{ marginTop: 10, color: '#97a9c8' }}>No current position snapshot available.</div>}
    </div>
  );
};

export default DashboardPage;
