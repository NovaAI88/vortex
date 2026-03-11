import React from 'react';
import BrandHeader from './BrandHeader';
import SidebarNav from './SidebarNav';
import TickerTape from './TickerTape';
import CommandPaletteStub from './CommandPaletteStub';

const PageLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ background: "#131a27", minHeight: "100vh", fontFamily: 'Inter, Segoe UI, Arial' }}>
    <BrandHeader />
    <div style={{ boxShadow: "0 1.5px 11px #03053d42", position:"relative", zIndex:15 }}>
      <TickerTape />
    </div>
    <div style={{ display: "flex", flexDirection: "row", minHeight: "93vh" }}>
      <aside style={{ width: 240, minHeight: "100%", boxShadow: "2px 0 18px #191e384a", background: "#171e2e" }}>
        <SidebarNav />
      </aside>
      <main style={{ flex: 1, minHeight: "100%", padding: "38px 42px 30px 38px", background: "#151b2a" }}>
        {children}
      </main>
    </div>
    <CommandPaletteStub />
  </div>
);


export default PageLayout;
