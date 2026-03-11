import React, { useEffect, useState } from 'react';
import PortfolioSummary from '../components/PortfolioSummary';
import { fetchPortfolio } from '../api/apiClient';

const PortfolioPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<any>(null);
  const [error, setError] = useState(null);
  useEffect(() => { fetchPortfolio().then(setPortfolio).catch(setError); }, []);
  if(error) return <div>Error: {String(error)}</div>;
  if(!portfolio) return <div>Loading...</div>;
  return <PortfolioSummary portfolio={portfolio} />;
};
export default PortfolioPage;
