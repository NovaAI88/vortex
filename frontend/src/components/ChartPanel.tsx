import React from 'react';

const ChartPanel: React.FC = () => {
  return (
    <div className="chart-panel" style={{
      background: "linear-gradient(142deg,#1b2739 80%,#304674 100%)",
      borderRadius: 18,
      minHeight: 398,
      minWidth:320,
      padding: '0 0 0 0',
      marginBottom: 18,
      boxShadow: '0 2px 32px #0b1232b3',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      border:'1.3px solid #26457e',
      position:'relative'
    }}>
      <span style={{
        color: '#7bc5fd',
        fontWeight: 700,
        letterSpacing: '-0.8px',
        fontSize: 21,
        opacity: 0.92, marginBottom:6
      }}>
        BTC/USD — 1H Chart
      </span>
      <div style={{width:'100%',height:320,background:'#171f33',borderRadius:13,boxShadow:'0 0 0 #0000',marginTop:8,display:'flex',alignItems:'center',justifyContent:'center'}}>
        <svg width="98%" height="97%" viewBox="0 0 660 300">
          <rect x="0" y="0" width="660" height="300" rx="13" fill="#18233f" />
          <polyline
            fill="none"
            stroke="#6bc1ff"
            strokeWidth="4"
            strokeLinejoin="round"
            points="17,250 87,150 162,160 236,81 309,136 389,45 470,143 547,80 610,220 "
          />
          <polyline
            fill="none"
            stroke="#43e583"
            strokeWidth="2"
            points="17,284 87,205 162,240 236,135 309,146 389,82 470,193 547,164 610,283 "
          />
        </svg>
      </div>
    </div>
  );
};

export default ChartPanel;
