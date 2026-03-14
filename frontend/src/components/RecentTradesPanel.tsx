import React, { useEffect, useState } from 'react';
import { fetchPortfolio } from '../api/apiClient';

type PaperTrade = {
  timestamp: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
};

const RecentTradesPanel: React.FC = () => {
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    setError(null);
    fetchPortfolio()
      .then(res => {
        if (!res || typeof res !== 'object' || !Array.isArray(res.trades)) {
          setTrades([]);
          setError('No trades data (unexpected backend response)');
        } else {
          setTrades(res.trades);
        }
      })
      .catch(() => mounted && setError('Failed to load trades'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  if (loading) return <div style={{padding:10}}>Loading trades…</div>;
  if (error) return <div style={{color:'#f97',padding:10}}>No recent trades.</div>;
  if (!trades.length) return <div style={{color:'#8b9aad',padding:10}}>None yet. Simulate a trade to see history.</div>;

  return (
    <div style={{padding:15,background:'#124d53',borderRadius:13,margin:'16px 0',boxShadow:'0 1px 6px #113d3a13',minWidth:260}}>
      <div style={{fontWeight:800,fontSize:'1.11rem',color:'#9fffd2',marginBottom:10}}>Recent Simulated Trades</div>
      <table style={{width:'100%',fontSize:14,color:'#e1feff',background:'none'}}>
        <thead>
          <tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th></tr>
        </thead>
        <tbody>
          {trades.map((t,i) => (
            <tr key={i} style={{borderBottom:'1.1px solid #234'}}>
              <td>{new Date(t.timestamp).toLocaleTimeString()}</td>
              <td>{t.symbol}</td>
              <td>{t.side}</td>
              <td>{t.qty}</td>
              <td>{t.price}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
export default RecentTradesPanel;
