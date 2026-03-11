import React from 'react';

const AETHER_LOGO = (
  <svg height="38" viewBox="0 0 44 38" style={{marginRight: 12}}>
    <defs>
      <linearGradient id="aether-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#50b7f5"/>
        <stop offset="100%" stopColor="#283fe6"/>
      </linearGradient>
    </defs>
    <polygon points="22,3 43,19 22,35 1,19" style={{fill:'url(#aether-gradient)',stroke:'#80eaff',strokeWidth:2}} />
    <circle cx="22" cy="19" r="5" fill="#283fe6" stroke="#80eaff" strokeWidth="2.25" />
  </svg>
);

const BrandHeader: React.FC = () => (
  <header style={{
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(to right, #1a2332 60%, #192466 100%)',
    height: 62,
    padding: '0 40px',
    borderBottom: '1.5px solid #273652',
    boxShadow: '0 2px 12px #01051a33',
    letterSpacing: '0.05em',
    zIndex: 20
  }}>
    {AETHER_LOGO}
    <span style={{
      color: '#80eaff',
      fontWeight: 800,
      fontSize: '2rem',
      fontFamily: 'Inter, Segoe UI, Arial',
      textShadow: '0 3px 12px #1b364b77',
      textTransform: 'uppercase',
      letterSpacing: '0.09em',
      userSelect: 'none',
      marginRight: 12
    }}>
      AETHER
    </span>
    <span style={{color: '#99e0ff', fontWeight: 400, fontSize: '1.13rem', opacity: 0.7, marginLeft: 10}}>
      Operator Terminal
    </span>
    <div style={{flex:1}}/>
    <div style={{fontWeight: 500,letterSpacing:
     '0.04em', color: '#b8cdf4', fontSize:'1rem',textTransform:'uppercase'}}>v1.0</div>
  </header>
);

export default BrandHeader;
