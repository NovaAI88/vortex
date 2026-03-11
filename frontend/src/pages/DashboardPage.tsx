import React, { useEffect, useState } from 'react';
import StatusCard from '../components/StatusCard';
import PortfolioSummary from '../components/PortfolioSummary';
import PositionTable from '../components/PositionTable';
import ChartPanel from '../components/ChartPanel';
import OrderBookStub from '../components/OrderBookStub';
import TradeFlowStub from '../components/TradeFlowStub';
import AlertPanel from '../components/AlertPanel';
import MarketCards from '../components/MarketCards';
import NewsPanel from '../components/NewsPanel';
import MarketIntelPanel from '../components/MarketIntelPanel';
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
      <h2 style={{
        marginTop: 0,
        marginBottom: '1.2rem',
        fontSize: '2.11rem',
        letterSpacing: '-1px',
        fontWeight: 800,
        color: '#84ebfe',
        fontFamily: 'Inter, Segoe UI, Arial',
        textShadow: '0 1.5px 16px #1b243844',
        paddingLeft: 4
      }}>Operator Dashboard</h2>
      <MarketCards />
      <div style={{
        display: 'grid',
        gridTemplateColumns: '3.5fr 1.5fr',
        gap: '30px',
        alignItems: 'flex-start',
        width: '100%'
      }}>
        {/* Main Center Terminal Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <ChartPanel />
          <div style={{display:'flex',gap:22}}>
            <MarketIntelPanel />
            <NewsPanel />
          </div>
          <div style={{background:'#151d29',borderRadius:10,padding:'23px 24px 20px 24px',marginTop:12,boxShadow:'0 1px 8px #09183566'}}>
            <StatusCard {...(status||{})} />
            <PortfolioSummary {...(portfolio||{})} />
            <div className="ui-card" style={{marginTop:6}}>
              <PositionTable positions={positions} />
            </div>
          </div>
        </div>

        {/* Right column: Trading panels etc. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <OrderBookStub />
          <TradeFlowStub />
          <AlertPanel />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
