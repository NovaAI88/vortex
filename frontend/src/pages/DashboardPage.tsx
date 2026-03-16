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
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';

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

  const equity = portfolio?.equity ?? '-';
  const dailyPnl = portfolio?.pnl ?? '-';
  const healthState = status?.status === 'ok' ? 'healthy' : 'warning';

  return (
    <div>
      <PageHeaderBar
        title="AETHER Dashboard"
        subtitle="Unified AI trading terminal overview"
        status={healthState}
        statusLabel={status?.status ? String(status.status).toUpperCase() : 'LIVE'}
        activeSymbol="BTCUSDT"
        timestamp={status?.timestamp}
      />

      <KpiStrip>
        <KpiCard label="Portfolio Equity" value={equity} />
        <KpiCard label="Daily PnL" value={dailyPnl} tone={typeof dailyPnl === 'number' ? (dailyPnl >= 0 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Active Strategies" value={3} />
        <KpiCard label="Risk Utilization" value="37%" />
      </KpiStrip>

      {/* Top market overview strip */}
      <section style={{ marginBottom: 12 }}>
        <MarketCards />
      </section>

      {/* Main grid w/ terminal layout */}
      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) 390px', minHeight: 640, alignItems: 'start' }}>
        {/* Center workspace: Dominant chart/panels */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          <ChartPanel />

          <div className="ui-card" style={{ padding: '14px 16px', marginBottom: 0 }}>
            <StrategyPerformanceTable />
          </div>
          <div className="ui-card" style={{ padding: '14px 16px', marginBottom: 0 }}>
            <StrategyWeightsPanel />
          </div>

          <div className="ui-bottom-row" style={{ marginBottom: 2 }}>
            <MarketIntelPanel />
            <NewsPanel />
          </div>
        </section>

        {/* Right compact operations/info column */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 310, maxWidth: 420 }}>
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
