import React, { useEffect, useMemo, useState } from 'react';
import { API_BASE } from '../api/config';

type MarketCardItem = {
  symbol: string;
  price: number;
  changePct: number;
  trend: 'Bullish' | 'Bearish' | 'Sideways';
  momentum: 'Strong' | 'Moderate' | 'Weak';
  source: 'live' | 'fallback' | 'unavailable';
};

const formatPrice = (price: number) => {
  if (price < 1) return price.toFixed(4);
  if (price < 100) return price.toFixed(2);
  return price.toLocaleString(undefined, { maximumFractionDigits: 2 });
};

const pillStyle = (label: string) => ({
  fontSize: 11,
  fontWeight: 700,
  padding: '4px 8px',
  borderRadius: 999,
  border: '1px solid #2e374c',
  color: label === 'Bullish' || label === 'Strong' ? '#7fee82' : label === 'Bearish' || label === 'Weak' ? '#ff9f9f' : '#e8cc77',
  background: '#1a2030',
  letterSpacing: '.25px',
});

const MarketCards: React.FC = () => {
  const [marketData, setMarketData] = useState<MarketCardItem[]>([]);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/market/price-history`);
        if (!resp.ok) throw new Error('Market history unavailable');
        const raw = await resp.json();
        const points = Array.isArray(raw) ? raw : [];
        const first = points[0];
        const last = points[points.length - 1];
        const firstPrice = Number(first?.price);
        const lastPrice = Number(last?.price);
        const pct = Number.isFinite(firstPrice) && firstPrice > 0 && Number.isFinite(lastPrice)
          ? ((lastPrice - firstPrice) / firstPrice) * 100
          : 0;
        const source = (last?.source === 'live' ? 'live' : points.length ? 'fallback' : 'unavailable') as MarketCardItem['source'];
        const absPct = Math.abs(pct);
        const trend: MarketCardItem['trend'] = pct > 0.15 ? 'Bullish' : pct < -0.15 ? 'Bearish' : 'Sideways';
        const momentum: MarketCardItem['momentum'] = absPct > 1.2 ? 'Strong' : absPct > 0.4 ? 'Moderate' : 'Weak';
        const next = Number.isFinite(lastPrice)
          ? [{ symbol: 'BTCUSDT', price: lastPrice, changePct: pct, trend, momentum, source }]
          : [{ symbol: 'BTCUSDT', price: 0, changePct: 0, trend: 'Sideways', momentum: 'Weak', source: 'unavailable' }];
        if (mounted) setMarketData(next);
      } catch {
        if (!mounted) return;
        setMarketData([{ symbol: 'BTCUSDT', price: 0, changePct: 0, trend: 'Sideways', momentum: 'Weak', source: 'unavailable' }]);
      }
    };
    load();
    const timer = setInterval(load, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  const hasLive = useMemo(() => marketData.some((x) => x.source === 'live'), [marketData]);

  return (
    <div>
      <div style={{ fontSize: 12, color: '#a8bbdb', marginBottom: 8 }}>
        Market cards source: {hasLive ? 'live backend feed' : 'backend unavailable or fallback-only'}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
        gap: 10,
        marginBottom: 6,
        alignItems: 'stretch',
      }}>
      {marketData.map((item) => {
        const positive = item.changePct >= 0;
        const noPrice = item.source === 'unavailable' || item.price <= 0;
        return (
          <div
            key={item.symbol}
            style={{
              background: 'linear-gradient(160deg,#171d2b 60%,#222c42 100%)',
              border: '1px solid #2a3247',
              borderRadius: 12,
              padding: '10px 11px',
              boxShadow: '0 1px 10px #00000030',
              minHeight: 108,
              color: '#dce8ff',
            }}
          >
            <div style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.3px', color: '#a7c6f2' }}>{item.symbol}</div>
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 6, color: '#f4f7ff' }}>{noPrice ? 'No live data' : `$${formatPrice(item.price)}`}</div>
            <div style={{ fontSize: 13, marginTop: 3, color: positive ? '#7fee82' : '#ff9f9f', fontWeight: 700 }}>
              {noPrice ? 'Unavailable' : `${positive ? '+' : ''}${item.changePct.toFixed(2)}%`}
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <span style={pillStyle(item.trend)}>{item.trend}</span>
              <span style={pillStyle(item.momentum)}>{item.momentum}</span>
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default MarketCards;
