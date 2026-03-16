import React, { useEffect, useState } from 'react';
import { fetchStrategyPerformance } from '../api/apiClient';

const POLL_INTERVAL = 4000;

const StrategyPerformanceTable: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let mounted = true;
    const load = (isInitial = false) => {
      if (isInitial) setLoading(true);
      setError(null); // Clear error before each refresh
      fetchStrategyPerformance()
        .then(res => { if(mounted) setData(res); })
        .catch(() => mounted && setError('Failed to fetch performance'))
        .finally(() => { if(mounted && isInitial) setLoading(false); });
    };
    load(true);
    const t = setInterval(() => load(false), POLL_INTERVAL);
    return () => { mounted = false; clearInterval(t); };
  }, []);

  if (loading) return <div style={{padding:16, color:'#9cb6d8'}}>Loading strategy performance…</div>;
  if (!!error && !data.length) return <div style={{padding:14, color:'#cdbe73'}}>Performance feed unavailable right now.</div>;
  if (!data.length) return <div style={{padding:16, color:'#93a5c4'}}>No strategy performance data available yet.</div>;

  return (
    <div className="ui-card" style={{ marginBottom: 0, padding: 16, minWidth: 300 }}>
      <div style={{fontWeight:700,fontSize:15,color:'#cde4ff',marginBottom:10}}>Strategy Variant Performance</div>
      {error && <div style={{color:'#d0bf70',marginBottom:8,fontSize:12}}>Refresh warning: {error}</div>}
      <table className="ui-table" style={{width:'100%',background:'none'}}>
        <thead>
          <tr>
            <th style={{textAlign:'left'}}>Strategy</th>
            <th style={{textAlign:'left'}}>Variant</th>
            <th>Trades</th>
            <th>Wins</th>
            <th>Losses</th>
            <th>Win Rate</th>
            <th>PnL</th>
            <th>Drawdown</th>
            <th>Last Equity</th>
          </tr>
        </thead>
        <tbody>
        {data.map((d, idx) => (
          <tr key={d.strategyId + d.variantId + idx}>
            <td style={{fontWeight:600,color:'#8dfaff'}}>{d.strategyId}</td>
            <td style={{fontWeight:500,color:'#fff2a9'}}>{d.variantId}</td>
            <td>{d.trades}</td>
            <td style={{color:'#7affae'}}>{d.wins}</td>
            <td style={{color:'#ef9393'}}>{d.losses}</td>
            <td>{(d.winRate*100).toFixed(1)}%</td>
            <td style={{color:d.realizedPnL>=0?'#8af8b1':'#fdab8c'}}>{d.realizedPnL.toFixed(2)}</td>
            <td>{d.maxDrawdown.toFixed(2)}%</td>
            <td>{d.lastEquity.toFixed(2)}</td>
          </tr>
        ))}
        </tbody>
      </table>
    </div>
  );
};

export default StrategyPerformanceTable;
