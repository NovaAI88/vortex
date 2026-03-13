import React, { useEffect, useRef, useState } from 'react';
import { fetchTrades as fetchTradesApi } from '../api/apiClient';
interface Trade {
  side: string;
  price: string;
  size: string;
  time: string;
}
const clr = (side: string) => side === 'buy' ? '#78f5bd' : '#ff8989';
const POLL_INTERVAL = 5000;

const TradeFlowStub: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const inFlight = useRef(false);

  const fetchTrades = async (isInitial = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const d = await fetchTradesApi();
      setTrades(d);
      setStale(false);
    } catch (err: any) {
      setError('No data from backend');
      setStale(true);
    } finally {
      inFlight.current = false;
      if (isInitial) setLoading(false);
    }
  };
  useEffect(() => {
    fetchTrades(true);
    const interval = setInterval(() => fetchTrades(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ background:'#191e30',borderRadius:12,padding:'11px 16px 13px',color:'#dbefff',boxShadow:'0 1px 9px #09192d36',border:'1.15px solid #2a3564',fontFamily:'Roboto Mono, monospace',marginBottom:6 }}>
      <div style={{fontWeight:700, fontSize:16.2, color:'#62f2c2', marginBottom:5,letterSpacing:'0.01em'}}>Trade Flow</div>
      {loading ? (
        <div style={{ color: '#abc' }}>Loading…</div>
      ) : trades.length === 0 ? (
        <div style={{ color: '#ffeeb3',fontWeight:600 }}>No recent trades</div>
      ) : (
        <>
        {trades.map((row, i) => (
          <div key={i} style={{fontSize:14.2, fontWeight:600, color: clr(row.side), display:'flex', gap:18}}>
            <span>{row.side.toUpperCase()}</span>
            <span>{row.price}</span>
            <span style={{color:'#c7e8e0'}}>{row.size} BTC</span>
            <span style={{marginLeft:'auto', opacity:0.61, fontWeight:400}}>{row.time}</span>
          </div>
        ))}
        {stale && <div style={{ color: '#f6e18d', fontSize:12, marginTop:3 }}>Data is stale / last backend fetch failed.</div>}
        </>
      )}
    </div>
  );
};
export default TradeFlowStub;
