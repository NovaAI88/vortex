import React from 'react';
import BrandHeader from './BrandHeader';
import SidebarNav from './SidebarNav';
import CommandPaletteStub from './CommandPaletteStub';

import { useLocation } from 'react-router-dom';

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  // Always scroll to top on route change
  React.useEffect(() => {
    if (typeof window !== 'undefined') window.scrollTo(0, 0);
  }, [location.pathname]);

  return (
    <div style={{ background: '#0f1723', minHeight: '100vh', fontFamily: 'Inter, Segoe UI, Arial', color: '#eaf1fa' }}>
      <BrandHeader />
      <div style={{ display: 'flex', flexDirection: 'row', minHeight: '92vh' }}>
        <aside style={{ width: 248, minHeight: '100%', boxShadow: '2px 0 14px #1a254111', background: '#161f2e', borderRight: '2.5px solid #23355b', position: 'relative', zIndex: 21 }}>
          <SidebarNav />
        </aside>
        <main style={{ flex: 1, minHeight: '100%', background: '#0f151f' }}>
          <div className="ui-page-shell">{children}</div>
        </main>
      </div>
      <CommandPaletteStub />
    </div>
  );
};

export default PageLayout;
