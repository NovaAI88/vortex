import React, { useEffect, useMemo, useState } from 'react';
import PortfolioPanel from '../components/PortfolioPanel';
import RecentTradesPanel from '../components/RecentTradesPanel';
import { fetchPortfolio } from '../api/apiClient';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

type PortfolioData = {
  balance?: number;
  cash?: number;
  equity?: number;
  totalValue?: number;
  pnl?: number;
  positions?: Array<any>;
  trades?: Array<any>;
};

const POLL_INTERVAL = 5000;

const PortfolioPage: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = () => {
      fetchPortfolio()
        .then((res) => {
          if (mounted) setPortfolio(res || null);
        })
        .catch(() => {
          if (mounted) setPortfolio(null);
        });
    };

    load();
    const tid = setInterval(load, POLL_INTERVAL);
    return () => {
      mounted = false;
      clearInterval(tid);
    };
  }, []);

  const balance = useMemo(() => portfolio?.cash ?? portfolio?.balance ?? null, [portfolio]);
  const equity = useMemo(() => portfolio?.totalValue ?? portfolio?.equity ?? null, [portfolio]);
  const realizedPnl = useMemo(() => portfolio?.pnl ?? null, [portfolio]);
  const positions = useMemo(() => (Array.isArray(portfolio?.positions) ? portfolio?.positions : []), [portfolio]);
  const trades = useMemo(() => (Array.isArray(portfolio?.trades) ? portfolio?.trades : []), [portfolio]);
  const openPositions = positions.filter((p: any) => Number(p?.qty || 0) !== 0).length;

  const unrealizedPnl = useMemo(() => {
    if (!positions.length) return null;
    const vals = positions
      .map((p: any) => Number(p?.unrealizedPnL))
      .filter((n: number) => Number.isFinite(n));
    if (!vals.length) return null;
    return vals.reduce((a, b) => a + b, 0);
  }, [positions]);

  const portfolioHealth = typeof realizedPnl === 'number' ? (realizedPnl >= 0 ? 'healthy' : 'warning') : 'info';

  const fmt = (v: number | null) => (typeof v === 'number' ? v.toLocaleString(undefined, { maximumFractionDigits: 2 }) : 'N/A');

  return (
    <div>
      <PageHeaderBar
        title="Portfolio Command Center"
        subtitle="Portfolio, risk, and execution overview"
        status={portfolioHealth}
        statusLabel="PORTFOLIO LIVE"
        activeSymbol="MULTI-ASSET"
      />

      <KpiStrip>
        <KpiCard label="Balance" value={fmt(balance)} />
        <KpiCard label="Equity" value={fmt(equity)} />
        <KpiCard label="Realized PnL" value={fmt(realizedPnl)} tone={typeof realizedPnl === 'number' ? (realizedPnl >= 0 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Unrealized PnL" value={fmt(unrealizedPnl)} tone={typeof unrealizedPnl === 'number' ? (unrealizedPnl >= 0 ? 'positive' : 'negative') : 'neutral'} />
        <KpiCard label="Open Positions" value={openPositions} />
        <KpiCard label="Trade Count" value={trades.length || 'N/A'} />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 360px)' }}>
        <SectionCard title="Portfolio Summary / Account Overview">
          <div style={{ display: 'grid', gap: 10, fontSize: 13, color: '#bdd0ef' }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div><b style={{ color: '#dce8ff' }}>Balance:</b> {fmt(balance)}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#dce8ff' }}>Equity:</b> {fmt(equity)}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#dce8ff' }}>Trades Logged:</b> {trades.length}</div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div><b style={{ color: '#dce8ff' }}>Positions Value:</b> {typeof equity === 'number' && typeof balance === 'number' ? fmt(equity - balance) : 'N/A'}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#dce8ff' }}>Open Positions:</b> {openPositions}</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Risk & Allocation"
          actionSlot={<HealthBadge state={portfolioHealth} label={portfolioHealth === 'healthy' ? 'RISK OK' : portfolioHealth === 'warning' ? 'WATCH RISK' : 'INFO'} />}
        >
          <div style={{ display: 'grid', gap: 10, fontSize: 13, color: '#bdd0ef' }}>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div><b style={{ color: '#dce8ff' }}>Exposure:</b> {openPositions > 0 ? `${openPositions} active legs` : 'No active exposure'}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#dce8ff' }}>Realized PnL:</b> {fmt(realizedPnl)}</div>
            </div>
            <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
              <div><b style={{ color: '#dce8ff' }}>Equity/Bal Ratio:</b> {typeof equity === 'number' && typeof balance === 'number' && balance !== 0 ? (equity / balance).toFixed(3) : 'N/A'}</div>
              <div style={{ marginTop: 6 }}><b style={{ color: '#dce8ff' }}>Allocation Mode:</b> Paper Trading</div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', marginTop: 12 }}>
        <SectionCard title="Open Positions">
          <PortfolioPanel />
        </SectionCard>
        <SectionCard title="Recent Executions">
          <RecentTradesPanel />
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="AI Portfolio Context"
          text="Portfolio is operating in paper mode with live signal flow. Track equity drift versus realized PnL to validate strategy quality before increasing automation depth."
          source="Portfolio intelligence layer"
        />
        <InsightCard
          title="Risk Interpretation"
          text="Prioritize exposure discipline when unrealized PnL diverges from realized trajectory. If divergence widens during high volatility, tighten position sizing and refresh risk thresholds."
          source="Operator guidance engine"
        />
      </div>
    </div>
  );
};

export default PortfolioPage;
