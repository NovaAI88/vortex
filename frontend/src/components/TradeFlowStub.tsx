import React, { useEffect, useRef, useState } from 'react';

interface Trade {
  timestamp: string;
  symbol: string;
  side: string;
  qty: number;
  price: number;
  variantId?: string;
  status: string;
  reason?: string;
}

const POLL_INTERVAL = 5000;

const TradeFlowPanel: React.FC = () => {
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
      const data = await fetchTrades();
      setTrades(Array.isArray(data) ? data : []);
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
        <div style={{ color: '#ffeeb3',fontWeight:600 }}>No recent trades.</div>
      ) : (
        <div style={{ maxHeight: 220, overflowY: 'auto' }}>
        {trades.map((row, i) => (
          <div key={i} style={{fontSize:13.5, fontWeight:500, color: row.side === 'buy' ? '#77efab' : '#ff9797', display:'flex', gap:12, alignItems:'center', borderBottom:'1px solid #25314c', padding:'4px 0'}}>
            <span style={{minWidth:85, opacity:0.61, fontFamily:'monospace', fontSize:13}}>{new Date(row.timestamp).toLocaleTimeString()}</span>
            <span><b>{row.symbol}</b></span>
            <span>{row.side.toUpperCase()}</span>
            <span>{row.qty}</span>
            <span>{row.price!=null ? row.price.toLocaleString() : '—'}</span>
            {row.variantId && <span style={{color:'#cfc'}}>{row.variantId}</span>}
            <span style={{fontWeight:700}}>{row.status}</span>
            {row.reason && <span style={{fontSize:12, color:'#eed48f'}} title={row.reason}>({row.reason.slice(0,36)})</span>}
          </div>
        ))}
        </div>
      )}
      {stale && <div style={{ color: '#f6e18d', fontSize:12, marginTop:3 }}>Trade flow is stale / backend fetch failed.</div>}
      {error && <div style={{ color: '#ff8585', marginTop: 5 }}>{error}</div>}
    </div>
  );
};
export default TradeFlowPanel;
