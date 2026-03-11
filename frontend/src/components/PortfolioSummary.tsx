import React from 'react';

const PortfolioSummary: React.FC<{ portfolio: any }> = ({ portfolio }) => (
  <div style={{border:'1px solid #ddd', borderRadius:8, padding:16, margin:16}}>
    <h2>Portfolio Snapshot</h2>
    <div><b>Equity:</b> {portfolio.equity}</div>
    <div><b>Open Positions:</b> {portfolio.openPositions?.join(', ')}</div>
    <div><b>Last Exec Result:</b> {portfolio.lastExecutionResultId}</div>
    <div><b>Timestamp:</b> {portfolio.timestamp}</div>
  </div>
);
export default PortfolioSummary;
