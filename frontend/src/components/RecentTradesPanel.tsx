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

  if (loading) return <div style={{padding:10, color:'#9cb6d8'}}>Loading trades…</div>;
  if (error) return <div style={{color:'#f9bf97',padding:10}}>Trade feed unavailable.</div>;
  if (!trades.length) return <div style={{color:'#8b9aad',padding:10}}>No recent trades yet. Execute a simulated trade to populate history.</div>;

  return (
    <div className="ui-card" style={{padding:16,margin:'16px 0',minWidth:260}}>
      <div style={{fontWeight:700,fontSize:15,color:'#cde4ff',marginBottom:10}}>Recent Simulated Trades</div>
      <table className="ui-table" style={{width:'100%',background:'none'}}>
        <thead>
          <tr><th>Time</th><th>Symbol</th><th>Side</th><th>Qty</th><th>Price</th></tr>
        </thead>
        <tbody>
          {trades.map((t,i) => (
            <tr key={i}>
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
