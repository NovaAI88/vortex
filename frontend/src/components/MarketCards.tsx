import React from 'react';

const coins = [
  { symbol: 'BTC', label: 'Bitcoin', price: '66,843.52', change: '+2.3%', color:'#ffd94c', icon:'₿' },
  { symbol: 'ETH', label: 'Ethereum', price: '3,590.14', change: '-0.4%', color:'#50b5e5', icon:'Ξ' },
  { symbol: 'SOL', label: 'Solana', price: '177.21', change: '+5.1%', color:'#42f7b0', icon:'◎'}
];

const MarketCards: React.FC = () => (
  <div style={{ display: 'flex', gap: 18, marginBottom: 18 }}>
    {coins.map(c => (
      <div key={c.symbol} style={{
        background: 'linear-gradient(150deg,#161e3f 60%,#243f59 100%)',
        padding: '20px 26px',
        borderRadius: 14,
        minWidth: 165,
        minHeight: 76,
        color: c.color,
        fontWeight: 700,
        display:'flex',flexDirection:'column',justifyContent:'center',boxShadow:'0 1px 16px #0002'
      }}>
        <span style={{ fontSize: 27, fontWeight: 800 }}>{c.icon} <span style={{fontSize:16,color:'#b1dafe',marginLeft:7}}>{c.symbol}</span></span>
        <span style={{ fontWeight: 600, fontSize: 19, color:'#f9f9f9',margin:'6px 0 2px 0',letterSpacing:'-0.5px'}}>{c.price}</span>
        <span style={{ fontSize: 15, fontWeight: 500, color: (c.change[0]==='+'?'#7fee82':'#f28f8f')}}>{c.change}</span>
      </div>
    ))}
  </div>
);

export default MarketCards;
