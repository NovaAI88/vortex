import React from 'react';

type PortfolioSummaryProps = {
  totalValue?: number;
  [key: string]: any;
};

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ totalValue, ...rest }) => (
  <div style={{ border: '1px solid #e0e0e0', borderRadius: 6, padding: '1rem', marginBottom: '1rem', background: '#f6f8fa' }}>
    <h2>Portfolio</h2>
    <p><b>Total Value:</b> {totalValue != null ? `$${totalValue.toLocaleString()}` : 'N/A'}</p>
    {/* Render other portfolio fields if they exist */}
    {Object.entries(rest).map(([key, value]) => (
      <p key={key}><b>{key}:</b> {value as string}</p>
    ))}
  </div>
);

export default PortfolioSummary;
