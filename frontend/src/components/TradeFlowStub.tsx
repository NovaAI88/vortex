import React, { useEffect, useState } from 'react';
interface Trade {
  side: string;
  price: string;
  size: string;
  time: string;
}
const clr = (side: string) => side === 'buy' ? '#78f5bd' : '#ff8989';
const TradeFlowStub: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchTrades = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('http://localhost:3000/api/trades');
      if (!resp.ok) throw new Error('Failed to fetch trades');
      const d = await resp.json();
      setTrades(d);
    } catch (err: any) {
      setError('No data from backend');
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchTrades();
    const interval = setInterval(fetchTrades, 3000);
    return () => clearInterval(interval);
  }, []);
  return (
    <div style={{ background:'#191e30',borderRadius:12,padding:'11px 16px 13px',color:'#dbefff',boxShadow:'0 1px 9px #09192d36',border:'1.15px solid #2a3564',fontFamily:'Roboto Mono, monospace',marginBottom:6 }}>
      <div style={{fontWeight:700, fontSize:16.2, color:'#62f2c2', marginBottom:5,letterSpacing:'0.01em'}}>Trade Flow</div>
      {loading ? (
        <div style={{ color: '#abc' }}>Loading…</div>
      ) : error ? (
        <div style={{ color: '#f95e5e'}}>{error}</div>
      ) : trades.length === 0 ? (
        <div style={{ color: '#ffeeb3' }}>No recent trades</div>
      ) : (
        trades.map((row, i) => (
          <div key={i} style={{fontSize:14.2, fontWeight:600, color: clr(row.side), display:'flex', gap:18}}>
            <span>{row.side.toUpperCase()}</span>
            <span>{row.price}</span>
            <span style={{color:'#c7e8e0'}}>{row.size} BTC</span>
            <span style={{marginLeft:'auto', opacity:0.61, fontWeight:400}}>{row.time}</span>
          </div>
        ))
      )}
    </div>
  );
};
export default TradeFlowStub;
