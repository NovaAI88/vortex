import React, { useEffect, useState } from 'react';
import PortfolioSummary from '../components/PortfolioSummary';
import { fetchPortfolio } from '../api/apiClient';

const PortfolioPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPortfolio()
      .then(setPortfolio)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{marginTop:0, fontWeight:700, fontSize:'2rem',letterSpacing:'-1px'}}>Portfolio Overview</h2>
      <div className="ui-card" style={{maxWidth:460}}>
        {loading
          ? 'Loading portfolio...'
          : error
          ? <div style={{color:'#f95e5e',fontWeight:600}}>Error: {error}</div>
          : portfolio
          ? <PortfolioSummary {...portfolio} />
          : <div className="ui-card ui-card-empty">No portfolio data available.</div>}
      </div>
    </div>
  );
};

export default PortfolioPage;
