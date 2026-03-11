import React from 'react';

const navLinks = [
  { label: 'Dashboard', icon: '📊' },
  { label: 'Market Terminal', icon: '💹' },
  { label: 'Portfolio', icon: '💼' },
  { label: 'Alerts', icon: '🚨' }
];

const SidebarNav: React.FC = () => (
  <nav style={{
    padding: '46px 0 8px 0',
    minHeight: '100vh',
    background: 'linear-gradient(180deg,#181f2e 70%,#202c3f 100%)',
    borderRight: '1px solid #233455',
    boxShadow: '2px 0 18px #08112c11',
    display: 'flex',
    flexDirection: 'column',
    gap: 16
  }}>
    {navLinks.map((link) => (
      <a
        href={"#"+link.label.toLowerCase().replace(/ /g,'-')}
        key={link.label}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 36px',
          borderRadius: 12,
          color: '#e8f4ff',
          fontWeight: 700,
          fontSize: '1.17rem',
          margin: '0 12px',
          background: 'linear-gradient(90deg,#233455 50%,#182138 100%)',
          textDecoration: 'none',
          transition: 'all 0.14s',
          marginBottom: 5,
          boxShadow: '0 1px 8px #1a3e6861',
          letterSpacing:'0.02em',
          cursor:'pointer',
        }}
        onMouseOver={e => e.currentTarget.style.background='#283c5a'}
        onMouseOut={e => e.currentTarget.style.background='linear-gradient(90deg,#233455 50%,#182138 100%)'}
      >
        <span style={{ fontSize: '1.3em',marginRight:12 }}>{link.icon}</span>
        {link.label}
      </a>
    ))}
    <div style={{flex:1}}></div>
    <div style={{textAlign:'center',margin:'32px 0',color:'#46626e',fontSize:'0.98rem',fontWeight:600}}>AETHER &copy; 2026</div>
  </nav>
);

export default SidebarNav;
