import React, { useEffect, useState } from 'react';
import StatusCard from '../components/StatusCard';
import PortfolioSummary from '../components/PortfolioSummary';
import PositionTable from '../components/PositionTable';
import { fetchStatus, fetchPortfolio, fetchPositions } from '../api/apiClient';

const DashboardPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStatus().catch(() => null),
      fetchPortfolio().catch(() => null),
      fetchPositions().catch(() => [])
    ])
    .then(([statusResp, portfolioResp, positionsResp]) => {
      setStatus(statusResp);
      setPortfolio(portfolioResp);
      setPositions(positionsResp || []);
    })
    .catch((err) => setError(String(err)))
    .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading dashboard...</div>;
  if (error) return <div style={{color:'red'}}>Error: {error}</div>;

  return (
    <div>
      <h2 style={{ marginTop: 0 }}>Operator Overview</h2>
      {status && <StatusCard {...status} />}
      {portfolio && <PortfolioSummary {...portfolio} />}
      <PositionTable positions={positions} />
    </div>
  );
};

export default DashboardPage;
