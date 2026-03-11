import React from 'react';
import BrandHeader from './BrandHeader';
import SidebarNav from './SidebarNav';
import TickerTape from './TickerTape';
import CommandPaletteStub from './CommandPaletteStub';

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: '#111728', minHeight: '100vh' }}>
    <BrandHeader />
    <div style={{ boxShadow: '0 2px 16px #0002', position:'relative', zIndex:10 }}> <TickerTape /> </div>
    <div className="app-shell" style={{ display:'flex', flexDirection:'row', minHeight:'80vh' }}>
      <aside className="sidebar" style={{ width: 220, background:'#182034', minHeight: '100%' }}>
        <SidebarNav />
      </aside>
      <div className="main-container" style={{ flex: 1, padding:'32px 40px 32px 40px' }}>
        {children}
      </div>
    </div>
    <CommandPaletteStub />
  </div>
);

export default PageLayout;
