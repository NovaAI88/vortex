import React, { useEffect, useState } from 'react';
import ChartPanel from '../components/ChartPanel';
import MarketCards from '../components/MarketCards';
import OrderBookStub from '../components/OrderBookStub';
import TradeFlowStub from '../components/TradeFlowStub';
import AlertPanel from '../components/AlertPanel';
import NewsPanel from '../components/NewsPanel';
import MarketIntelPanel from '../components/MarketIntelPanel';
import StrategyPerformanceTable from '../components/StrategyPerformanceTable';
import StrategyWeightsPanel from '../components/StrategyWeightsPanel';
import EngineStatusPanel from '../components/EngineStatusPanel';
import OperatorControlsPanel from '../components/OperatorControlsPanel';
import { fetchStatus, fetchPortfolio } from '../api/apiClient';

const DashboardPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [portfolio, setPortfolio] = useState<any>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchStatus().catch(() => null),
      fetchPortfolio().catch(() => null)
    ])
      .then(([statusResp, portfolioResp]) => {
        setStatus(statusResp);
        setPortfolio(portfolioResp);
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{padding:60,color:'#7ec4ee'}}>Loading terminal…</div>;
  if (error) return <div style={{color:'#f95e5e',fontWeight:700,padding:60}}>Error: {error}</div>;

  return (
    <div style={{ width: '98vw', maxWidth: 1800, margin: '0 auto', padding: '8px 0' }}>
      {/* Top market overview strip */}
      <section style={{ marginBottom: 14 }}>
        <MarketCards />
      </section>

      {/* Main grid w/ terminal layout */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) 390px',
        gap: '22px',
        minHeight: 640,
        alignItems: 'start',
      }}>
        {/* Center workspace: Dominant chart/panels */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <ChartPanel />

          <div className="ui-card" style={{ padding: '14px 16px' }}>
            <StrategyPerformanceTable />
          </div>
          <div className="ui-card" style={{ padding: '14px 16px' }}>
            <StrategyWeightsPanel />
          </div>

          <div style={{ display: 'flex', gap: 14, marginBottom: 4, alignItems: 'flex-start' }}>
            <MarketIntelPanel />
            <NewsPanel />
          </div>
        </section>

        {/* Right compact operations/info column */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 310, maxWidth: 420 }}>
          <OperatorControlsPanel />
          <OrderBookStub />
          <TradeFlowStub />
          <AlertPanel />
          <EngineStatusPanel />
        </aside>
      </div>
    </div>
  );
};

export default DashboardPage;
