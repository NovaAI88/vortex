import React, { useEffect, useState } from 'react';

interface OrderBookData {
  bids: [string, string][];
  asks: [string, string][];
  support: string;
  resistance: string;
}

const OrderBookStub: React.FC = () => {
  const [data, setData] = useState<OrderBookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrderBook = async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('http://localhost:3000/api/orderbook');
      if (!resp.ok) throw new Error('Failed to fetch orderbook');
      const d = await resp.json();
      setData(d);
    } catch (err: any) {
      setError('No data from backend');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrderBook();
    const interval = setInterval(fetchOrderBook, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background:'#191f34',borderRadius:12,padding:'16px 16px 13px',color:'#a8dfff',boxShadow:'0 1px 9px #09192d5c',minHeight:120,border:'1.1px solid #28426e',marginBottom:6,fontFamily:'Roboto Mono, monospace'}}>
      <div style={{fontWeight:700, fontSize:16.8, color:'#c0f3ff', marginBottom:4,letterSpacing:'0.01em'}}>Order Book</div>
      {loading ? (<div style={{ color: '#abc' }}>Loading…</div>) : error ? (
        <div style={{ color: '#f95e5e'}}>{error}</div>
      ) : data ? (
        <div>
          <div style={{fontSize:14.7,fontWeight:400,marginTop:2}}>
            <b>Bids:</b> {data.bids.map(([px, sz],i)=>(<span key={i}>{px} | {sz} BTC </span>))}
          </div>
          <div style={{fontSize:14.7,fontWeight:400,marginTop:2}}>
            <b>Asks:</b> {data.asks.map(([px, sz],i)=>(<span key={i}>{px} | {sz} BTC </span>))}
          </div>
          <div style={{fontSize:13.8,color:'#67dea7',marginTop:2,fontWeight:500}}>{data.support} support, {data.resistance} resistance</div>
        </div>
      ) : (
        <div style={{ color: '#f95e5e'}}>No data available</div>
      )}
    </div>
  );
};
export default OrderBookStub;
