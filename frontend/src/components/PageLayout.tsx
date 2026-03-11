import React from 'react';
import { Link } from 'react-router-dom';

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>
    <nav style={{ marginBottom: 16 }}>
      <Link to='/'>Dashboard</Link> | <Link to='/status'>Status</Link> | <Link to='/position'>Position</Link> | <Link to='/portfolio'>Portfolio</Link>
    </nav>
    <main>{children}</main>
  </div>
);
export default PageLayout;
