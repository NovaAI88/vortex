import React, { useMemo } from 'react';

type MarketCardItem = {
  symbol: string;
  price: number;
  change24h: number;
  trend: 'Bullish' | 'Bearish' | 'Sideways';
  momentum: 'Strong' | 'Moderate' | 'Weak';
};

// Safe demo data for multi-symbol view.
// Replace this with backend data later without changing render logic.
const DEMO_MARKET_DATA: MarketCardItem[] = [
  { symbol: 'BTCUSDT', price: 68342.55, change24h: 2.8, trend: 'Bullish', momentum: 'Strong' },
  { symbol: 'ETHUSDT', price: 3642.12, change24h: 1.4, trend: 'Bullish', momentum: 'Moderate' },
  { symbol: 'SOLUSDT', price: 178.91, change24h: 3.9, trend: 'Bullish', momentum: 'Strong' },
  { symbol: 'AVAXUSDT', price: 41.27, change24h: -1.2, trend: 'Sideways', momentum: 'Weak' },
  { symbol: 'DOGEUSDT', price: 0.1824, change24h: 0.9, trend: 'Sideways', momentum: 'Moderate' },
  { symbol: 'LINKUSDT', price: 19.84, change24h: -0.6, trend: 'Bearish', momentum: 'Weak' },
];

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
  const marketData = useMemo(() => DEMO_MARKET_DATA, []);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 12,
      marginBottom: 6,
    }}>
      {marketData.map((item) => {
        const positive = item.change24h >= 0;
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
            <div style={{ fontWeight: 700, fontSize: 17, marginTop: 6, color: '#f4f7ff' }}>${formatPrice(item.price)}</div>
            <div style={{ fontSize: 13, marginTop: 3, color: positive ? '#7fee82' : '#ff9f9f', fontWeight: 700 }}>
              {positive ? '+' : ''}{item.change24h.toFixed(2)}%
            </div>

            <div style={{ display: 'flex', gap: 6, marginTop: 9, flexWrap: 'wrap' }}>
              <span style={pillStyle(item.trend)}>{item.trend}</span>
              <span style={pillStyle(item.momentum)}>{item.momentum}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default MarketCards;
