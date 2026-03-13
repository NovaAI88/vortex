import React from 'react';
import { NavLink } from 'react-router-dom';

const navLinks = [
  { label: 'Dashboard', href: '/', icon: (
    <svg width="23" height="23" fill="none"><rect x="4" y="10" width="4.5" height="8.3" rx="1.8" fill="#89e1fe" /><rect x="10" y="5" width="4.5" height="13.5" rx="1.8" fill="#5fb4fb" /><rect x="16" y="13" width="4.5" height="5.5" rx="1.8" fill="#54ffbf" /></svg>
  ) },
  { label: 'Market Terminal', href: '/market', icon: (
    <svg width="23" height="23" fill="none"><path d="M4 15L9 8.5L14 16.5L19 5" stroke="#49bfec" strokeWidth="2"/><circle cx="4" cy="15" r="2.2" fill="#6ecaf8"/><circle cx="9" cy="8.5" r="2.2" fill="#6bc1ff"/><circle cx="14" cy="16.5" r="2.2" fill="#69ffcc"/><circle cx="19" cy="5" r="2.2" fill="#83eaff"/></svg>
  ) },
  { label: 'AI Analysis', href: '/ai', icon: (
    <svg width="22" height="22" fill="none"><circle cx="11" cy="11" r="10" fill="#3e47bf" opacity=".13" /><path d="M11 6v10m-5-5h10" stroke="#98e1ff" strokeWidth="2.2" strokeLinecap="round" /><circle cx="11" cy="11" r="3.5" fill="#83eaff" opacity=".3" /></svg>
  ) },
  { label: 'News/Market Intelligence', href: '/news', icon: (
    <svg width="22" height="22" fill="none"><rect x="5" y="7" width="12" height="8" rx="3" fill="#7fe9ff" opacity=".22" /><rect x="7.9" y="10.3" width="6.2" height="2.5" rx="1.1" fill="#ecfcff" /></svg> ) },
  { label: 'Sentiment', href: '/sentiment', icon: (
    <svg width="22" height="22" fill="none"><circle cx="11" cy="11" r="8.5" fill="#fff146" opacity=".2" /><path d="M7.8 13C8.3 13.9 9.56 14.5 11 14.5s2.7-.6 3.2-1.5" stroke="#ffe37c" strokeWidth="1.45" strokeLinecap="round"/></svg> ) },
  { label: 'Technical Analysis', href: '/ta', icon: (
    <svg width="22" height="22" fill="none"><rect x="7" y="7" width="8" height="8" rx="1.2" fill="#adaaff" opacity=".17" /><rect x="4.5" y="13.5" width="13" height="2.5" rx="1.2" fill="#b8c5ee" /></svg> ) },
  { label: 'Narrative Edge', href: '/narrative', icon: (<svg width="21" height="21" fill="none"><ellipse cx="10.5" cy="13.5" rx="8.2" ry="6.4" fill="#fffad1" opacity=".12"/><path d="M10.5,7.3 a6.4,6.4 0 1,0 .01,0" stroke="#ffeaa7" strokeWidth="1.3"/></svg>) },
  { label: 'Portfolio', href: '/portfolio', icon: (
    <svg width="22" height="22" fill="none"><rect x="4" y="7.5" width="14.5" height="8" rx="2.5" fill="#56ffa4" opacity=".18" stroke="#71e1c1" strokeWidth="2.3"/><rect x="7" y="10" width="8" height="4" rx="1.4" fill="#35d2b5" opacity=".7" /></svg> ) },
  { label: 'Alerts', href: '/alerts', icon: (
    <svg width="22" height="22"><circle cx="11" cy="11" r="10" fill="#ffcea0" opacity=".08" /><path d="M11 5v4m0 5v2" stroke="#ffcea0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="4.25" fill="#fff1e0" opacity=".19" /></svg> ) },
  { label: 'Backtest', href: '/backtest', icon: (
    <svg width="22" height="22" fill="none"><circle cx="11" cy="11" r="10" fill="#bbf9e9" opacity=".08" /><rect x="5" y="8" width="12" height="6" rx="2.5" fill="#12ffb1" opacity=".18" stroke="#53ffd9" strokeWidth="2.3"/><path d="M7 13l4-4 4 4" stroke="#37d7b2" strokeWidth="1.3"/></svg>) },
];

const SidebarNav: React.FC = () => (
  <nav style={{
    padding: '35px 0 16px 0',
    height: '100vh',
    minWidth: 76,
    background: 'linear-gradient(180deg, #161c2a 60%, #202c3f 100%)',
    borderRight: '2px solid #18264a',
    boxShadow: '2px 0 18px #161d310e',
    display: 'flex',
    flexDirection: 'column',
    alignItems:'center',
    gap: 8,
    zIndex:20
  }}>
    {navLinks.map((link) => (
      <NavLink
        to={link.href}
        key={link.label}
        style={({ isActive }) => ({
          display: 'flex',
          flexDirection: 'column',
          alignItems:'center',
          gap: 7,
          justifyContent: 'center',
          padding: '15px 0 8px 0',
          width: 62,
          borderRadius: 14,
          color: isActive ? '#aeefff' : '#e5f5ff',
          fontWeight: 700,
          fontSize: '0.99rem',
          background: isActive
            ? 'linear-gradient(180deg,#2c3a8e 0%,#13234c 100%)'
            : 'linear-gradient(180deg,#232d69 0%,#0f1628 100%)',
          margin: '0 0 5px 0',
          boxShadow: isActive
            ? '0 4px 26px #30fdff25, 0 2px 16px #02123919'
            : '0 2px 16px #02123919',
          letterSpacing:'0.01em',
          textDecoration:'none',
          transition: 'all 0.18s',
          cursor:'pointer',
          border: isActive ? '2.5px solid #32cfff' : '2px solid #202a4d',
        })}
        onMouseOver={e => {
          e.currentTarget.style.background='#20305a';
          e.currentTarget.style.color='#aeefff';
          e.currentTarget.style.transform='translateY(-2px) scale(1.07)';
        }}
        onMouseOut={e => {
          //@ts-ignore
          const isActive = e.currentTarget.classList.contains('active');
          e.currentTarget.style.background=isActive
            ? 'linear-gradient(180deg,#2c3a8e 0%,#13234c 100%)'
            : 'linear-gradient(180deg,#232d69 0%,#0f1628 100%)';
          e.currentTarget.style.color=isActive ? '#aeefff' : '#e5f5ff';
          e.currentTarget.style.transform='none';
        }}
        className={({ isActive }) => isActive ? 'active' : ''}
      >
        {link.icon}
        <span style={{ fontSize: '1.06em',marginTop:1,letterSpacing:'-.01em' }}>{link.label}</span>
      </NavLink>
    ))}
    <div style={{flex:1}}></div>
  </nav>
);

export default SidebarNav;
