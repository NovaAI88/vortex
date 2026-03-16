import React, { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Scatter, ScatterChart, CartesianGrid } from 'recharts';

function formatTs(ts: string|number) {
  try {
    return new Date(ts).toLocaleString(undefined, { hour: '2-digit', minute: '2-digit', second:'2-digit', month: '2-digit', day: '2-digit' });
  } catch { return String(ts); }
}

const ChartPanel: React.FC = () => {
  const [prices, setPrices] = useState<{timestamp:string,price:number}[]>([]);
  const [trades, setTrades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string|null>(null);

  useEffect(() => {
    let active = true;
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        const API_BASE = 'http://localhost:3000';
        const [pResp, tResp] = await Promise.all([
          fetch(`${API_BASE}/api/market/price-history`),
          fetch(`${API_BASE}/api/portfolio/paper`)
        ]);
        if (!pResp.ok || !tResp.ok) throw new Error('chart-endpoint-unavailable');
        const pricePts = (await pResp.json()) || [];
        const tradeData = ((await tResp.json()) || {}).trades || [];
        if (active) { setPrices(pricePts); setTrades(tradeData); }
      } catch (e) { if (active) setError('Failed to load chart data'); }
      finally { if (active) setLoading(false); }
    }
    fetchAll();
    const tid = setInterval(fetchAll, 7000);
    return () => { active = false; clearInterval(tid); };
  }, []);

  if (loading) return <div style={{padding:33,color:'#abe'}}>Loading chart…</div>;
  if (error) return <div style={{color:'#f98',padding:15}}>Error: {error}</div>;
  if (!prices.length) return <div style={{color:'#888',padding:33}}>No market price data yet.</div>;

  // Trades for overlay markers
  const tradeMarkers = trades.filter(tr => tr.symbol === 'BTCUSDT' && tr.price && tr.timestamp);
  // Find nearest price index for each trade
  const scatterPoints = tradeMarkers.map(tr => {
    const nearestIdx = prices.findIndex(pt => new Date(pt.timestamp).getTime() >= new Date(tr.timestamp).getTime());
    if (nearestIdx === -1) return null;
    return {
      x: prices[nearestIdx].timestamp,
      y: prices[nearestIdx].price,
      price: tr.price,
      side: tr.side,
      variant: tr.variantId,
      timestamp: tr.timestamp,
      pnl: tr.pnl
    };
  }).filter(Boolean);

  return (
    <div style={{width:'100%',background:'#181e29',borderRadius:14,padding:'16px 10px 8px',marginBottom:0,boxShadow:'0 1px 16px #19213680'}}>
      <div style={{fontWeight:700,margin:'0 0 9px 11px',fontSize:15.7,color:'#aae9ff'}}>BTCUSDT (Binance) Live Price</div>
      <ResponsiveContainer width="100%" height={387}>
        <LineChart data={prices}
          margin={{ top: 17, right: 26, left: 1, bottom: 2 }}>
          <CartesianGrid stroke="#273043" strokeOpacity={0.3} vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={t=>formatTs(t)} minTickGap={76} stroke="#aef" fontSize={12} tickMargin={8}/>
          <YAxis type="number" domain={['auto','auto']} tick={{fontSize:13,fill:'#aef'}} tickFormatter={n=>n?.toLocaleString()} width={68} stroke="#aef"/>
          <Tooltip wrapperStyle={{background:'#191c2c',borderRadius:5}} labelFormatter={t=>formatTs(t as string)} formatter={(v)=>(typeof v==='number'?v.toLocaleString() : v)}/>
          <Line type="monotone" dataKey="price" stroke="#47e5ff" strokeWidth={2.4} dot={false} name="Price"/>
          {scatterPoints.length>0 &&
            <Scatter
              data={scatterPoints}
              fill="#7fffc4"
              shape={(props:any) => {
                const color = props.payload.side === 'buy' ? '#22e081' : '#f75a7e';
                return <circle cx={props.cx} cy={props.cy} r={5} fill={color} stroke="#000" strokeWidth={1.3}/>;
              }}
              name="Trades"
            />
          }
        </LineChart>
      </ResponsiveContainer>
      {scatterPoints.length > 0 &&
        <div style={{fontSize:12.3,marginLeft:12,marginTop:5,color:'#b8f8cc'}}>Trade Markers: <span style={{color:'#1cf488'}}>BUY</span> <span style={{marginLeft:8,color:'#ff7a7a'}}>SELL</span></div>
      }
    </div>
  );
};

export default ChartPanel;
