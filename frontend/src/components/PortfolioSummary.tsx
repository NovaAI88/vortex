import React from 'react';

type PortfolioSummaryProps = {
  totalValue?: number;
  [key: string]: any;
};

const PortfolioSummary: React.FC<PortfolioSummaryProps> = ({ totalValue, ...rest }) => (
  <div>
    <div style={{fontSize:'1.08rem',color:'#b2bdd7',fontWeight:600,marginBottom:6}}>Balance Summary</div>
    <div style={{fontSize:'2.0rem',fontWeight:700,color:'#7f93f8',marginBottom:'0.8rem'}}>{totalValue != null ? `$${totalValue.toLocaleString()}` : 'N/A'}</div>
    {/* Render other portfolio fields if they exist */}
    <div style={{display:'flex',flexWrap:'wrap',gap:'1.4rem',color:'#97a0b8',fontSize:'1.01rem'}}>
      {Object.entries(rest).map(([key, value]) => (
        <div key={key}><b style={{color:'#8296c9'}}>{key}:</b> {value as string}</div>
      ))}
    </div>
  </div>
);

export default PortfolioSummary;
