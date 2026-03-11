import React, { useEffect, useState } from 'react';
import StatusCard from '../components/StatusCard';
import PortfolioSummary from '../components/PortfolioSummary';
import PositionTable from '../components/PositionTable';
import ChartPanel from '../components/ChartPanel';
import OrderBookStub from '../components/OrderBookStub';
import TradeFlowStub from '../components/TradeFlowStub';
import AlertPanel from '../components/AlertPanel';
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
      <div className="trading-terminal-grid" style={{
        display: 'grid',
        gridTemplateColumns: '2fr 340px',
        gap: '32px',
        width: '100%',
        margin: 0
      }}>
        {/* Main Center Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <ChartPanel />
          <StatusCard {...(status||{})} />
          <PortfolioSummary {...(portfolio||{})} />
          <div className="ui-card" style={{marginTop:8}}>
            <PositionTable positions={positions} />
          </div>
          <div style={{marginTop:16}}>
            <AlertPanel />
          </div>
        </div>

        {/* Right Column: Order book/trade flow */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <OrderBookStub />
            <TradeFlowStub />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
