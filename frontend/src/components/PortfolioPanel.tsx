import React, { useEffect, useState } from 'react';
import { fetchPortfolio } from '../api/apiClient';

const POLL_INTERVAL = 4000;

type PaperPosition = {
  symbol: string;
  side: 'long'|'short'|'flat';
  qty: number;
  avgEntry: number;
  markPrice: number|null;
  unrealizedPnL: number|null;
  variantId?: string|null;
  plannedEntry?: number|null;
  stopLoss?: number|null;
  takeProfit?: number|null;
  lastUpdated?: string;
};
function formatPosTable(positions: PaperPosition[]|Record<string, PaperPosition>) {
  const rows = Array.isArray(positions) ? positions : Object.values(positions || {}).filter((p) => p.qty !== 0);
  if (!rows.length) return <div style={{color:'#9cb0cc',padding:'9px 0'}}>No open positions currently.</div>;
  return (
    <table className="ui-table" style={{width:'100%', background:'none'}}>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Side</th>
          <th>Qty</th>
          <th>Entry</th>
          <th>Current Price</th>
          <th>Unrealized PnL</th>
          <th>Variant</th>
          <th>Stop Loss</th>
          <th>Take Profit</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((pos, idx) => (
          <tr key={pos.symbol + '-' + idx}>
            <td>{pos.symbol}</td>
            <td>{pos.side}</td>
            <td>{pos.qty}</td>
            <td>{pos.avgEntry}</td>
            <td>{pos.markPrice != null ? pos.markPrice : '—'}</td>
            <td>{pos.unrealizedPnL != null ? pos.unrealizedPnL.toFixed(2) : '—'}</td>
            <td>{pos.variantId || '—'}</td>
            <td>{pos.stopLoss != null ? pos.stopLoss : '—'}</td>
            <td>{pos.takeProfit != null ? pos.takeProfit : '—'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}


type PaperPortfolio = {
  balance: number;
  equity: number;
  pnl: number;
  positions: PaperPosition[];
  cash?: number;
  totalValue?: number;
  positionsValue?: number;
};

const PortfolioPanel: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PaperPortfolio|null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    const load = (isInitial = false) => {
      if (isInitial) setLoading(true);
      setError(null);
      fetchPortfolio()
        .then(res => { if(mounted) setPortfolio(res); })
        .catch(() => mounted && setError('Failed to fetch portfolio'))
        .finally(() => { if(mounted && isInitial) setLoading(false); });
    };
    load(true);
    const t = setInterval(() => load(false), POLL_INTERVAL);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  if (loading) return <div style={{padding:13, color:'#9cb6d8'}}>Loading portfolio…</div>;
  if (error && !portfolio) return <div style={{color:'#f9bf97',padding:10}}>Portfolio stream unavailable.</div>;
  if (!portfolio) return <div style={{color:'#9cb0cc',padding:10}}>No portfolio data available.</div>;

  return (
    <div className="ui-card" style={{padding:16,marginBottom:0,minWidth:280}}>
      <div style={{fontWeight:700,fontSize:15,color:'#cde4ff',marginBottom:10}}>Paper Trading Portfolio</div>
      {error && <div style={{color:'#f9bf97',marginBottom:7,fontSize:12}}>Refresh warning: {error}</div>}
      <div><b>Balance:</b> <span style={{color:'#e2ffe8',fontWeight:600}}>${(portfolio.cash ?? portfolio.balance)?.toLocaleString()}</span></div>
      <div><b>Equity:</b> <span style={{color:'#a1ffe8'}}>${(portfolio.totalValue ?? portfolio.equity)?.toLocaleString()}</span></div>
      <div><b>Positions Value:</b> <span style={{color:'#a1ffe8'}}>${portfolio.positionsValue?.toLocaleString()}</span></div>
      <div><b>Realized PnL:</b> <span style={{color:portfolio.pnl>=0?'#7affae':'#ffaeae'}}>{portfolio.pnl?.toFixed(2)}</span></div>
      <div style={{marginTop:10,marginBottom:8,fontWeight:700,color:'#b8d2f5',fontSize:13}}>Positions</div>
      {portfolio.positions ? formatPosTable(portfolio.positions) : <span style={{color:'#9cb0cc'}}>No active positions.</span>}
    </div>
  );
};

export default PortfolioPanel;
