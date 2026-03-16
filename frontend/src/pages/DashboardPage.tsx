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
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

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
  const engineMode = status?.mode || 'PAPER';
  const signalCount = 9;

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
        <KpiCard label="Engine Mode" value={engineMode} />
        <KpiCard label="Signal Count" value={signalCount} />
      </KpiStrip>

      <section style={{ marginBottom: 12 }}>
        <MarketCards />
      </section>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(320px, 390px)', alignItems: 'start' }}>
        <SectionCard title="Live Price & Trade Overlay">
          <ChartPanel />
        </SectionCard>

        <SectionCard
          title="Operator Control Stack"
          actionSlot={<HealthBadge state={healthState} label={healthState === 'healthy' ? 'SYSTEM HEALTHY' : 'CHECK SYSTEM'} />}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <OperatorControlsPanel />
            <EngineStatusPanel />
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="Strategy Health & Performance">
          <StrategyPerformanceTable />
        </SectionCard>
        <SectionCard title="Strategy Weights & Allocation">
          <StrategyWeightsPanel />
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <SectionCard title="Market Intelligence Feed">
          <MarketIntelPanel />
        </SectionCard>
        <SectionCard title="Market News & Narrative">
          <NewsPanel />
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <SectionCard title="Order Book">
          <OrderBookStub />
        </SectionCard>
        <SectionCard title="Trade Flow">
          <TradeFlowStub />
        </SectionCard>
        <SectionCard title="Alert Summary">
          <AlertPanel />
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="AI Operator Context"
          text="Execution remains in paper mode with resilient fallback market feeds active. Monitor strategy confidence and risk utilization before enabling tighter automation."
          source="AETHER runtime telemetry"
        />
        <InsightCard
          title="Narrative Bias"
          text="Current flow suggests moderate bullish continuation with intermittent volatility compression. Watch for sentiment/news divergence against momentum signals."
          source="Market intelligence synthesis"
        />
      </div>
    </div>
  );
};

export default DashboardPage;
