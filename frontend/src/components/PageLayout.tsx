import React from 'react';
import BrandHeader from './BrandHeader';
import SidebarNav from './SidebarNav';

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div>
    <BrandHeader />
    <div className="app-shell">
      <aside className="sidebar">
        <SidebarNav />
      </aside>
      <div className="main-container">
        {children}
      </div>
    </div>
  </div>
);

export default PageLayout;
