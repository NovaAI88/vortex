import React from "react";
import PortfolioPanel from '../components/PortfolioPanel';
import RecentTradesPanel from '../components/RecentTradesPanel';

const PortfolioPage: React.FC = () => (
  <div style={{padding:'36px 0 0 12px',maxWidth:820,margin:'0 auto'}}>
    <h2 style={{fontSize:'2.04rem', color:'#a7ffef', fontWeight:800,marginBottom:12}}>Portfolio</h2>
    <PortfolioPanel />
    <RecentTradesPanel />
  </div>
);
export default PortfolioPage;
