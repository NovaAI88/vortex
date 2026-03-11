import React from 'react';

const intel = [
  { msg: "AI Risk Score: Neutral", color: '#43e583' },
  { msg: "Signal: BTC strong uptrend", color: '#66b6ff' },
  { msg: "Liquidations up 12% (24h)", color: '#f7cf6b' }
];

const MarketIntelPanel: React.FC = () => (
  <div style={{ background:'#1c2432',borderRadius:12,padding:'18px 24px',color:'#f7f7fa',boxShadow:'0 1px 16px #0001',marginBottom:13 }}>
    <div style={{fontWeight:700,fontSize:17,color:'#b0e9ce',marginBottom:8,letterSpacing:'-0.38px'}}>Market Intelligence</div>
    {intel.map((x,i) => (
      <div key={i} style={{marginBottom:7,lineHeight:1.32,color:x.color,fontWeight:600}}>
        {x.msg}
      </div>
    ))}
  </div>
);

export default MarketIntelPanel;
