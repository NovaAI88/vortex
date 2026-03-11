import React from 'react';

const navLinks = [
  { label: 'Dashboard', icon: (
      <svg width="23" height="23" fill="none"><rect x="4" y="10" width="4.5" height="8.3" rx="1.8" fill="#89e1fe" /><rect x="10" y="5" width="4.5" height="13.5" rx="1.8" fill="#5fb4fb" /><rect x="16" y="13" width="4.5" height="5.5" rx="1.8" fill="#54ffbf" /></svg>
    ) },
  { label: 'Market', icon: (
      <svg width="23" height="23" fill="none"><path d="M4 15L9 8.5L14 16.5L19 5" stroke="#49bfec" strokeWidth="2"/><circle cx="4" cy="15" r="2.2" fill="#6ecaf8"/><circle cx="9" cy="8.5" r="2.2" fill="#6bc1ff"/><circle cx="14" cy="16.5" r="2.2" fill="#69ffcc"/><circle cx="19" cy="5" r="2.2" fill="#83eaff"/></svg>
  ) },
  { label: 'AI Analysis', icon: (
      <svg width="22" height="22" fill="none"><circle cx="11" cy="11" r="10" fill="#3e47bf" opacity=".13" /><path d="M11 6v10m-5-5h10" stroke="#98e1ff" strokeWidth="2.2" strokeLinecap="round" /><circle cx="11" cy="11" r="3.5" fill="#83eaff" opacity=".3" /></svg>
    ) },
  { label: 'Portfolio', icon: (
      <svg width="22" height="22" fill="none"><rect x="4" y="7.5" width="14.5" height="8" rx="2.5" fill="#56ffa4" opacity=".18" stroke="#71e1c1" strokeWidth="2.3"/><rect x="7" y="10" width="8" height="4" rx="1.4" fill="#35d2b5" opacity=".7" /></svg>
    ) },
  { label: 'Alerts', icon: (
      <svg width="22" height="22"><circle cx="11" cy="11" r="10" fill="#ffcea0" opacity=".08" /><path d="M11 5v4m0 5v2" stroke="#ffcea0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="11" cy="11" r="4.25" fill="#fff1e0" opacity=".19" /></svg>
    ) }
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
      <a
        href={"#"+link.label.toLowerCase()}
        key={link.label}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems:'center',
          gap: 7,
          justifyContent: 'center',
          padding: '15px 0 8px 0',
          width: 62,
          borderRadius: 14,
          color: '#e5f5ff',
          fontWeight: 700,
          fontSize: '0.99rem',
          background: 'linear-gradient(180deg,#232d69 0%,#0f1628 100%)',
          margin: '0 0 5px 0',
          boxShadow: '0 2px 16px #02123919',
          letterSpacing:'0.01em',
          textDecoration:'none',
          transition: 'all 0.16s',
          cursor:'pointer',
          border:'2px solid #202a4d',
        }}
        onMouseOver={e => {
          e.currentTarget.style.background='#20305a';
          e.currentTarget.style.color='#aeefff';
          e.currentTarget.style.transform='translateY(-2px) scale(1.07)';
        }}
        onMouseOut={e => {
          e.currentTarget.style.background='linear-gradient(180deg,#232d69 0%,#0f1628 100%)';
          e.currentTarget.style.color='#e5f5ff';
          e.currentTarget.style.transform='none';
        }}
      >
        {link.icon}
        <span style={{ fontSize: '1.06em',marginTop:1,letterSpacing:'-.01em' }}>{link.label}</span>
      </a>
    ))}
    <div style={{flex:1}}></div>
  </nav>
);

export default SidebarNav;
