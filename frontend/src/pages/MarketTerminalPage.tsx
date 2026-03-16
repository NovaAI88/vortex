import React, { useRef, useEffect, useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';

const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "AVAXUSDT", "DOGEUSDT"];
const timeframes = ["1", "5", "15", "60", "240", "D"];

const MarketTerminalPage: React.FC = () => {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("60");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (!window.TradingView && !document.getElementById('tradingview-widget-script')) {
      const script = document.createElement('script');
      script.id = 'tradingview-widget-script';
      script.src = 'https://s3.tradingview.com/tv.js';
      script.type = 'text/javascript';
      script.async = true;
      ref.current.appendChild(script);
      script.onload = () => renderWidget();
    } else setTimeout(renderWidget, 70);
    // eslint-disable-next-line
  }, [symbol, interval]);

  function renderWidget() {
    //@ts-ignore
    if (window.TradingView) {
      //@ts-ignore
      new window.TradingView.widget({
        width: '100%',
        height: 415,
        symbol: `BINANCE:${symbol}`,
        interval: interval,
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#141827',
        enable_publishing: false,
        allow_symbol_change: true,
        container_id: 'tv_terminal_chart',
        backgroundColor: '#181e29',
        hide_top_toolbar: false,
        hide_legend: false,
        hide_side_toolbar: false
      });
    }
  }

  return (
    <div>
      <PageHeaderBar
        title="Market Terminal"
        subtitle="Live symbol charting and execution context"
        status="info"
        statusLabel="STREAM"
        activeSymbol={symbol}
      />

      <KpiStrip>
        <KpiCard label="Price" value="67,085" />
        <KpiCard label="24h Change" value="+2.31%" tone="positive" />
        <KpiCard label="Funding Rate" value="0.0012%" />
        <KpiCard label="Volatility" value="Moderate" />
      </KpiStrip>

      <div style={{display:'flex',gap:18,marginBottom:13}}>
        <div>
          <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{fontSize:18,fontWeight:700,color:'#61f3e6',background:'#121b2e',padding:'6px 22px',borderRadius:8,marginRight:10,border:'2px solid #2f425b'}}>
            {symbols.map(s=>(<option key={s} value={s}>{s}</option>))}
          </select>
          <select value={interval} onChange={e=>setInterval(e.target.value)} style={{fontSize:17,fontWeight:700,color:'#8fcdff',background:'#181f2c',padding:'5.5px 14px',borderRadius:8,border:'2px solid #2b314a'}}>
            {timeframes.map(t=>(<option key={t} value={t}>{t==='D'?'1D':t+' min'}</option>))}
          </select>
        </div>
      </div>
      <div ref={ref} style={{width:'100%',maxWidth:1020}}>
        <div id="tv_terminal_chart" style={{ width: '100%', height: 410, borderRadius:16 }} />
      </div>
      <div style={{marginTop:40,display:'flex',gap:30,alignItems:'flex-start'}}>
        <div style={{background:'#181e32',padding:'18px 23px',borderRadius:11,boxShadow:'0 1px 13px #0002',color:'#ccefff',fontWeight:600,minHeight:120}}>
          <span style={{fontSize:17.3,fontWeight:800}}>Order Book</span>
          <div style={{margin:'13px 0',fontFamily:'Roboto Mono,monospace',fontWeight:400,color:'#b7ffd7'}}>67,084.00<br/>67,086.50<br/>67,062.80</div>
        </div>
        <div style={{background:'#181e2b',padding:'16px 16px',borderRadius:11,boxShadow:'0 1px 13px #02082911',color:'#ffeeb3',fontWeight:600,minHeight:110,minWidth:220}}>
          <span style={{fontSize:17.1,fontWeight:800}}>Trade Flow</span>
          <div style={{margin:'8px 0 0 4px',fontFamily:'Roboto Mono,monospace',color:'#fffbbb',fontWeight:600}}>BUY 67,085 (0.098 BTC)<br/>SELL 67,086 (0.25 BTC)</div>
        </div>
        <div style={{background:'#162138',padding:'13px 17px',borderRadius:10,minWidth:190,color:'#c9eaff',boxShadow:'0 1px 13px #0002',fontWeight:500}}><b>Market Panel</b><div style={{marginTop:9}}>Funding Rate: 0.0012%<br />OI: $1.32B<br/>Long/Short: 55:45</div></div>
      </div>
    </div>
  );
};
export default MarketTerminalPage;
