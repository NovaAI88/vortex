import React, { useEffect, useRef, useState } from 'react';
import { fetchOrderbook } from '../api/apiClient';

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
  support: string;
  resistance: string;
}

const POLL_INTERVAL = 5000;

const OrderBookStub: React.FC = () => {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  const inFlight = useRef(false);

  const fetchOrderBook = async (isInitial = false) => {
    if (inFlight.current) return;
    inFlight.current = true;
    if (isInitial) setLoading(true);
    setError(null);
    try {
      const d = await fetchOrderbook();
      setData(d);
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
    fetchOrderBook(true);
    const interval = setInterval(() => fetchOrderBook(false), POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background:'#191f34',borderRadius:12,padding:'16px 16px 13px',color:'#a8dfff',boxShadow:'0 1px 9px #09192d5c',minHeight:120,border:'1.1px solid #28426e',marginBottom:6,fontFamily:'Roboto Mono, monospace'}}>
      <div style={{fontWeight:700, fontSize:16.8, color:'#c0f3ff', marginBottom:4,letterSpacing:'0.01em'}}>Order Book</div>
      {loading ? (<div style={{ color: '#abc' }}>Loading…</div>) : !data ? (
        <div style={{ color: '#ffeeb3',fontWeight:600}}>Order Book feed not yet implemented.</div>
      ) : (
        <div>
          <div style={{fontSize:14.7,fontWeight:400,marginTop:2}}>
            <b>Bids:</b> {data.bids.map(([px, sz],i)=>(<span key={i}>{px} | {sz} BTC </span>))}
          </div>
          <div style={{fontSize:14.7,fontWeight:400,marginTop:2}}>
            <b>Asks:</b> {data.asks.map(([px, sz],i)=>(<span key={i}>{px} | {sz} BTC </span>))}
          </div>
          <div style={{fontSize:13.8,color:'#67dea7',marginTop:2,fontWeight:500}}>{data.support} support, {data.resistance} resistance</div>
          {stale && <div style={{ color: '#f6e18d', fontSize:12, marginTop:3 }}>Data is stale / last backend fetch failed.</div>}
        </div>
      )}
    </div>
  );
};
export default OrderBookStub;
