import React, { useRef, useEffect, useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import KpiStrip from '../components/ui/KpiStrip';
import KpiCard from '../components/ui/KpiCard';
import SectionCard from '../components/ui/SectionCard';
import InsightCard from '../components/ui/InsightCard';
import HealthBadge from '../components/ui/HealthBadge';

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
        <KpiCard label="Open Interest" value="$1.32B" />
        <KpiCard label="Long/Short Ratio" value="55/45" />
      </KpiStrip>

      <div className="ui-main-grid" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(300px, 360px)', alignItems: 'start' }}>
        <SectionCard title="TradingView Execution Chart">
          <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
            <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{fontSize:16,fontWeight:700,color:'#61f3e6',background:'#121b2e',padding:'6px 18px',borderRadius:8,border:'2px solid #2f425b'}}>
              {symbols.map(s=>(<option key={s} value={s}>{s}</option>))}
            </select>
            <select value={interval} onChange={e=>setInterval(e.target.value)} style={{fontSize:15,fontWeight:700,color:'#8fcdff',background:'#181f2c',padding:'5.5px 12px',borderRadius:8,border:'2px solid #2b314a'}}>
              {timeframes.map(t=>(<option key={t} value={t}>{t==='D'?'1D':t+' min'}</option>))}
            </select>
          </div>
          <div ref={ref} style={{width:'100%'}}>
            <div id="tv_terminal_chart" style={{ width: '100%', height: 440, borderRadius: 12 }} />
          </div>
        </SectionCard>

        <SectionCard
          title="Market Context Stack"
          actionSlot={<HealthBadge state="info" label="LIVE CONTEXT" />}
        >
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            <div className="ui-card" style={{marginBottom:0,padding:'12px 14px'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#cde4ff',marginBottom:8}}>Execution Context</div>
              <div style={{fontSize:13,color:'#b7c5df',lineHeight:1.5}}>Primary venue: Binance spot • Active symbol: {symbol} • Interval: {interval === 'D' ? '1D' : `${interval}m`}</div>
            </div>
            <div className="ui-card" style={{marginBottom:0,padding:'12px 14px'}}>
              <div style={{fontSize:13,fontWeight:700,color:'#cde4ff',marginBottom:8}}>Quick Stats</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,fontSize:12,color:'#b8c8e6'}}>
                <div>Funding: <b style={{color:'#eaf1ff'}}>0.0012%</b></div>
                <div>OI: <b style={{color:'#eaf1ff'}}>$1.32B</b></div>
                <div>Regime: <b style={{color:'#7fee82'}}>Trend</b></div>
                <div>Vol: <b style={{color:'#ffd67a'}}>Moderate</b></div>
              </div>
            </div>
          </div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <SectionCard title="Order Book">
          <div style={{fontFamily:'Roboto Mono,monospace',fontSize:13,color:'#b7ffd7',lineHeight:1.7}}>67,084.00<br/>67,086.50<br/>67,062.80</div>
        </SectionCard>
        <SectionCard title="Trade Flow">
          <div style={{fontFamily:'Roboto Mono,monospace',fontSize:13,color:'#fffbbb',lineHeight:1.7}}>BUY 67,085 (0.098 BTC)<br/>SELL 67,086 (0.25 BTC)</div>
        </SectionCard>
        <SectionCard title="Market Panel">
          <div style={{fontSize:13,color:'#c9eaff',lineHeight:1.7}}>Funding Rate: 0.0012%<br />OI: $1.32B<br/>Long/Short: 55:45</div>
        </SectionCard>
      </div>

      <div className="ui-bottom-row" style={{ marginTop: 12 }}>
        <InsightCard
          title="Market Structure Insight"
          text="Short-term structure remains constructive while pullbacks are being absorbed above intraday support. A clean break with volume would strengthen continuation bias."
          source="Terminal structure model"
        />
        <InsightCard
          title="Volatility & Risk Insight"
          text="Volatility is moderate with periodic burst risk around headline windows. Favor tighter sizing during high-impact news and widen only on confirmed trend expansion."
          source="Risk interpretation engine"
        />
      </div>
    </div>
  );
};
export default MarketTerminalPage;
