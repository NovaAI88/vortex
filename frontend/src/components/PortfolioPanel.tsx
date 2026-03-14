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
  // Support array or old object style
  const rows = Array.isArray(positions) ? positions : Object.values(positions || {}).filter((p) => p.qty !== 0);
  if (!rows.length) return <div style={{color:'#aaa',padding:'9px 0'}}>No open positions.</div>;
  return (
    <table style={{width:'100%', background:'none', color:'#e2f6ff',fontSize:14}}>
      <thead>
        <tr style={{background:'#1d3346'}}>
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
        {rows.map((pos) => (
          <tr key={pos.symbol} style={{borderBottom:'1.1px solid #244c56'}}>
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

  if (loading) return <div style={{padding:13}}>Loading portfolio…</div>;
  if (error && !portfolio) return <div style={{color:'#f97',padding:10}}>No paper trades yet.</div>;
  if (!portfolio) return <div style={{color:'#ccc',padding:10}}>No portfolio data.</div>;

  return (
    <div style={{padding:17,background:'#103a3b',borderRadius:13,marginBottom:14,boxShadow:'0 1px 8px #143d3a18',minWidth:280}}>
      <div style={{fontWeight:800,fontSize:'1.15rem',color:'#9fffd2',marginBottom:10}}>Paper Trading Portfolio</div>
      {error && <div style={{color:'#f97',marginBottom:7}}>Refresh error: {error}</div>}
      <div><b>Balance:</b> <span style={{color:'#e2ffe8',fontWeight:600}}>${portfolio.balance?.toLocaleString()}</span></div>
      <div><b>Equity:</b> <span style={{color:'#a1ffe8'}}>${portfolio.equity?.toLocaleString()}</span></div>
      <div><b>Realized PnL:</b> <span style={{color:portfolio.pnl>=0?'#7affae':'#ffaeae'}}>{portfolio.pnl?.toFixed(2)}</span></div>
      <div style={{marginTop:8,marginBottom:6,fontWeight:700,color:'#77c6e8'}}>Positions</div>
      {portfolio.positions ? formatPosTable(portfolio.positions) : <span style={{color:'#ccc'}}>None</span>}
    </div>
  );
};

export default PortfolioPanel;
