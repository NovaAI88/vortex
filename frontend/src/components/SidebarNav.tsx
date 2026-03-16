import React from 'react';
import { NavLink } from 'react-router-dom';

type NavItem = {
  label: string;
  href: string;
  short?: string;
  icon: React.ReactNode;
};

type NavGroup = {
  title: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    title: 'Core',
    items: [
      {
        label: 'Dashboard',
        short: 'HOME',
        href: '/',
        icon: <svg width="18" height="18" fill="none"><rect x="2" y="8" width="3.6" height="7" rx="1.4" fill="#89e1fe" /><rect x="7.2" y="3" width="3.6" height="12" rx="1.4" fill="#5fb4fb" /><rect x="12.4" y="10.5" width="3.6" height="4.5" rx="1.4" fill="#54ffbf" /></svg>,
      },
      {
        label: 'Market Terminal',
        short: 'MKT',
        href: '/market',
        icon: <svg width="18" height="18" fill="none"><path d="M2 12L6 6.5L10 13.5L16 4" stroke="#49bfec" strokeWidth="1.9"/><circle cx="2" cy="12" r="1.6" fill="#6ecaf8"/><circle cx="6" cy="6.5" r="1.6" fill="#6bc1ff"/><circle cx="10" cy="13.5" r="1.6" fill="#69ffcc"/><circle cx="16" cy="4" r="1.6" fill="#83eaff"/></svg>,
      },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      {
        label: 'AI Analysis',
        short: 'AI',
        href: '/ai',
        icon: <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="8" fill="#3e47bf" opacity=".13" /><path d="M9 4.5v9M4.5 9h9" stroke="#98e1ff" strokeWidth="2" strokeLinecap="round" /></svg>,
      },
      {
        label: 'News Intelligence',
        short: 'NEWS',
        href: '/news',
        icon: <svg width="18" height="18" fill="none"><rect x="3" y="5" width="12" height="8" rx="2.4" fill="#7fe9ff" opacity=".22" /><rect x="5.4" y="7.9" width="7.2" height="2" rx="0.9" fill="#ecfcff" /></svg>,
      },
      {
        label: 'Sentiment',
        short: 'SENT',
        href: '/sentiment',
        icon: <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="7" fill="#fff146" opacity=".18" /><path d="M6.2 10.5C6.7 11.3 7.7 11.8 9 11.8c1.3 0 2.3-.5 2.8-1.3" stroke="#ffe37c" strokeWidth="1.3" strokeLinecap="round"/></svg>,
      },
      {
        label: 'Technical Analysis',
        short: 'TA',
        href: '/ta',
        icon: <svg width="18" height="18" fill="none"><rect x="4.5" y="4.5" width="9" height="9" rx="1.2" fill="#adaaff" opacity=".17" /><rect x="3" y="11.5" width="12" height="2" rx="1" fill="#b8c5ee" /></svg>,
      },
      {
        label: 'Narrative Edge',
        short: 'NARR',
        href: '/narrative',
        icon: <svg width="18" height="18" fill="none"><ellipse cx="9" cy="11.2" rx="6.7" ry="5" fill="#fffad1" opacity=".12"/><path d="M9,5.2 a5.2,5.2 0 1,0 .01,0" stroke="#ffeaa7" strokeWidth="1.2"/></svg>,
      },
    ],
  },
  {
    title: 'Portfolio / Risk',
    items: [
      {
        label: 'Portfolio',
        short: 'PF',
        href: '/portfolio',
        icon: <svg width="18" height="18" fill="none"><rect x="2.8" y="5.5" width="12.4" height="7" rx="2.1" fill="#56ffa4" opacity=".18" stroke="#71e1c1" strokeWidth="1.9"/></svg>,
      },
      {
        label: 'Alerts',
        short: 'RISK',
        href: '/alerts',
        icon: <svg width="18" height="18"><circle cx="9" cy="9" r="8" fill="#ffcea0" opacity=".08" /><path d="M9 4.2v3.5m0 4.1v1.8" stroke="#ffcea0" strokeWidth="1.8" strokeLinecap="round"/><circle cx="9" cy="9" r="3.2" fill="#fff1e0" opacity=".18" /></svg>,
      },
      {
        label: 'Strategy Intelligence',
        short: 'STRAT',
        href: '/strategy',
        icon: <svg width="18" height="18" fill="none"><rect x="2.5" y="3.5" width="13" height="11" rx="2" fill="#95d4ff" opacity=".15"/><path d="M4.5 12l2.5-3 2.3 2 3.8-4" stroke="#89e1fe" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        label: 'Status',
        short: 'SYS',
        href: '/status',
        icon: <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="7" fill="#4cf8c7" opacity=".12"/><circle cx="9" cy="9" r="2.3" fill="#7ef2df"/></svg>,
      },
      {
        label: 'Backtest',
        short: 'BT',
        href: '/backtest',
        icon: <svg width="18" height="18" fill="none"><circle cx="9" cy="9" r="8" fill="#bbf9e9" opacity=".08" /><rect x="4" y="6.5" width="10" height="5" rx="1.8" fill="#12ffb1" opacity=".18" stroke="#53ffd9" strokeWidth="1.8"/></svg>,
      },
    ],
  },
];

const SidebarNav: React.FC = () => (
  <nav
    style={{
      padding: '14px 10px 16px 10px',
      height: '100vh',
      background: 'linear-gradient(180deg, #161c2a 60%, #202c3f 100%)',
      borderRight: '2px solid #18264a',
      boxShadow: '2px 0 18px #161d310e',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
      zIndex: 20,
      overflowY: 'auto',
    }}
  >
    {navGroups.map((group) => (
      <div key={group.title} style={{ borderBottom: '1px solid #213153', paddingBottom: 10 }}>
        <div
          style={{
            color: '#8ea9cf',
            fontSize: 11,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            fontWeight: 700,
            padding: '2px 8px 8px 8px',
          }}
        >
          {group.title}
        </div>

        <div style={{ display: 'grid', gap: 6 }}>
          {group.items.map((link) => (
            <NavLink
              to={link.href}
              key={link.label}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                padding: '9px 10px',
                borderRadius: 10,
                color: isActive ? '#d7f5ff' : '#d3e3f7',
                fontWeight: 700,
                fontSize: 13,
                background: isActive ? 'linear-gradient(180deg,#2c3a8e 0%,#13234c 100%)' : 'linear-gradient(180deg,#1a2236 0%,#111b2d 100%)',
                boxShadow: isActive ? '0 0 0 1px #5cd6ff inset, 0 6px 18px #30fdff1f' : '0 0 0 1px #243658 inset',
                textDecoration: 'none',
                transition: 'all 0.16s ease',
              })}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{link.icon}</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{link.label}</span>
              </span>
              <span style={{ fontSize: 10, color: '#8db0de', letterSpacing: '0.04em' }}>{link.short || ''}</span>
            </NavLink>
          ))}
        </div>
      </div>
    ))}
    <div style={{ flex: 1 }} />
  </nav>
);

export default SidebarNav;
