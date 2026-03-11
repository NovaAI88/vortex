import React from 'react';
import { NavLink } from 'react-router-dom';

const navs = [
  { path: '/', label: 'Dashboard' },
  { path: '/status', label: 'Status' },
  { path: '/position', label: 'Positions' },
  { path: '/portfolio', label: 'Portfolio' },
];

const SidebarNav: React.FC = () => (
  <nav className="sidebar-nav">
    {navs.map(({ path, label }) => (
      <NavLink
        key={path}
        to={path}
        className={({ isActive }) =>
          'sidebar-link' + (isActive ? ' active' : '')
        }
        end={path === '/'}
      >
        {label}
      </NavLink>
    ))}
  </nav>
);

export default SidebarNav;
