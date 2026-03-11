import React from 'react';

const coins = [
  { symbol: 'BTC/USD', price: '67,082.44', direction: '▲', color: '#ffe07f' },
  { symbol: 'ETH/USD', price: '3,584.11', direction: '▼', color: '#5ed6ff' },
  { symbol: 'SOL/USD', price: '177.70', direction: '▲', color: '#7fffd9' },
  { symbol: 'AVAX/USD', price: '53.22', direction: '▼', color: '#ff82ee' },
  { symbol: 'DOGE/USD', price: '0.172', direction: '▲', color: '#f5ff7b' },
];

const TickerTape: React.FC = () => {
  return (
    <div className="ticker-tape" style={{
      background: 'linear-gradient(90deg, #141829 75%, #151d31 100%)',
      padding: '10px 0 10px 18px',
      color: '#b1e6ff',
      fontWeight: 700,
      fontSize: '1.11rem',
      borderBottom: '1.5px solid #22365d',
      letterSpacing:'.04em',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      {coins.map((c, i) => (
        <span key={c.symbol} style={{ marginRight: 35, color: c.color }}>
          {c.symbol}
          <span style={{marginLeft:9,marginRight:5,fontWeight:800,fontVariantNumeric:'tabular-nums',color:'#eafff8'}}>{c.price}</span>
          <span style={{color: (c.direction === '▲' ? '#56ffa4' : '#ff6666'), fontWeight: 600, letterSpacing:'-0.06em',fontSize:'1.01em'}}>
            {c.direction}
          </span>
        </span>
      ))}
    </div>
  );
};

export default TickerTape;
