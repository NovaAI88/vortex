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
  if (error) return <div style={{color:'#f95e5e',fontWeight:600}}>Error: {error}</div>;

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: '2rem', fontSize: '2rem', letterSpacing: '-1px', fontWeight: 700 }}>Operator Overview</h2>
      <div className="dashboard-section">
        <div className="dashboard-maincol">
          <StatusCard {...(status||{})} />
          <PortfolioSummary {...(portfolio||{})} />
          <div className="ui-card">
            <PositionTable positions={positions} />
          </div>
        </div>
        <div className="dashboard-sidecol">
          <div className="ui-card ui-card-empty" style={{minHeight:96}}>(Market/Chart section placeholder)</div>
          <div className="activity-section">
            <span style={{fontWeight:600,letterSpacing:'0.5px',fontSize:'1.06rem'}}>Activity & System Log</span>
            <div style={{color:'#838fa4',margin:'0.5rem 0'}}>No recent activity.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
