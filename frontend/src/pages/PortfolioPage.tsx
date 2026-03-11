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

  if (loading) return <div>Loading portfolio...</div>;
  if (error) return <div style={{color:'red'}}>Error: {error}</div>;

  return (
    <>
      <PortfolioSummary {...(portfolio || {})} />
      {!portfolio && <div>No portfolio data available.</div>}
    </>
  );
};

export default PortfolioPage;
