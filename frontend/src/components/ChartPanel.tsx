import React, { useRef, useEffect } from 'react';

declare global {
  interface Window {
    TradingView?: any;
  }
}

// TradingView Widget Embed
const TradingViewWidget: React.FC<{ symbol?: string; interval?: string }> = ({ symbol = 'BINANCE:BTCUSDT', interval = '60' }) => {
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
    if (window.TradingView) {
      new window.TradingView.widget({
        width: '100%',
        height: 410,
        symbol,
        interval,
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
    <div style={{width:'100%',height:418,borderRadius:15,overflow:'hidden',background:'#181e29',boxShadow:'0 1px 16px #181e2974'}}>    
      <div id="tv_terminal_chart" style={{ width: '100%', height: 408, borderRadius:15 }} ref={ref} />
    </div>
  );
};

const ChartPanel: React.FC = () => (
  <div style={{marginBottom:15}}>
    <TradingViewWidget />
  </div>
);

export default ChartPanel;
