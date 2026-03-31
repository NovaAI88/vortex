import React from 'react';
import logoMark from '../assets/logo/aether-logo-mark.svg';

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
    <img
      src={logoMark}
      alt="VORTEX logo"
      width={44}
      height={44}
      style={{ marginRight: 18, filter: 'drop-shadow(0 1px 8px #1e305350)' }}
    />
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
      VORTEX
    </span>
    <span style={{color: '#98e1ff', fontWeight: 500, fontSize: '1.07rem', opacity: 0.76, marginLeft: 13,letterSpacing:'0.14em',textTransform:'uppercase'}}>Operator Terminal</span>
    <div style={{flex:1}}/>
    <div style={{fontWeight: 600,letterSpacing: '0.07em', color: '#bff3ff', fontSize:'1.09rem',textTransform:'uppercase'}}>v1.0</div>
  </header>
);

export default BrandHeader;
