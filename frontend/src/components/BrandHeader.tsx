import React from 'react';

const AetherLogo = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" style={{marginRight:18,filter:'drop-shadow(0 1px 8px #1e305350)'}}>
    <g>
      {/* Sharp custom stylized "A" geometric mark for AETHER */}
      <polygon points="22,4 40,40 22,32 4,40" fill="#232d69" stroke="#49bfec" strokeWidth="2.2"/>
      <polyline points="22,14 31,33 22,29 13,33 22,14" fill="none" stroke="#69d4ff" strokeWidth="2.4" strokeLinejoin="miter"/>
      <circle cx="22" cy="20" r="2.6" fill="#49bfec" />
    </g>
  </svg>
);

const BrandHeader: React.FC = () => (
  <header style={{
    display: 'flex',
    alignItems: 'center',
    background: 'linear-gradient(90deg,#101a2d 75%,#232d69 120%)',
    height: 62,
    padding: '0 44px',
    borderBottom: '1.8px solid #24294b',
    boxShadow: '0 2px 14px #02082436',
    letterSpacing: '0.07em',
    zIndex: 30,
    overflow:'hidden',
  }}>
    <AetherLogo />
    <span style={{
      color: '#86e6ff',
      fontWeight: 800,
      fontSize: '2.17rem',
      fontFamily: 'Inter, Segoe UI, Arial',
      textTransform: 'uppercase',
      letterSpacing: '0.13em',
      userSelect: 'none',
      marginRight: 8,
      verticalAlign:'middle',
      lineHeight:'110%'
    }}>
      <span style={{fontFamily:'serif',fontSize:'2.35rem',position:'relative',top:'-2px',marginRight:1,letterSpacing:'0.06em'}}>Æ</span>THER
    </span>
    <span style={{color: '#98e1ff', fontWeight: 500, fontSize: '1.07rem', opacity: 0.76, marginLeft: 13,letterSpacing:'0.14em',textTransform:'uppercase'}}>Operator Terminal</span>
    <div style={{flex:1}}/>
    <div style={{fontWeight: 600,letterSpacing: '0.07em', color: '#bff3ff', fontSize:'1.09rem',textTransform:'uppercase'}}>v1.0</div>
  </header>
);

export default BrandHeader;
