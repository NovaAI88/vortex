import React from 'react';

const mockData = {
  prediction: "Long (Buy)",
  bias: "Bullish",
  confidence: 0.82,
  entry: "67010.00",
  stop: "66880.00",
  take_profit: "67400.00",
  recommendation: "Moderate risk buy. Market structure confirms momentum. "
};

const AiPredictionPanel: React.FC = () => (
  <div style={{background:'#18212e',borderRadius:13,padding:'22px 28px',marginBottom:23,boxShadow:'0 1px 13px #27394a12',color:'#e4f1fd',maxWidth:510,minWidth:286}}>
    <div style={{fontWeight:700,fontSize:20,letterSpacing:'-0.3px',color:'#8fd9fe',marginBottom:7}}>AI Trade Analysis</div>
    <div style={{display:'flex',alignItems:'center',gap:18}}>
      <div style={{fontWeight:700,fontSize:18,color:'#77fbbe',minWidth:90}}>{mockData.prediction}</div>
      <div style={{fontSize:15,color:'#54caef',fontWeight:700,padding:'0 12px'}}>{mockData.bias}</div>
      <div style={{fontWeight:600,fontSize:15.1,background:'#161b29',padding:'5.5px 15px',borderRadius:9, color:'#9ffbfa'}}>Confidence: {(mockData.confidence*100).toFixed(1)}%</div>
    </div>
    <div style={{marginTop:14,fontSize:15.5,fontWeight:600}}>
      Entry: <span style={{color:'#99ffe3',fontWeight:800}}>{mockData.entry}</span>&nbsp;&nbsp;
      | Stop: <span style={{color:'#ff7870',fontWeight:700}}>{mockData.stop}</span>&nbsp;&nbsp;
      | Take Profit: <span style={{color:'#90dbff',fontWeight:700}}>{mockData.take_profit}</span>
    </div>
    <div style={{marginTop:13,color:'#dbefff',fontSize:15.2,fontWeight:500,maxWidth:380,opacity:0.93}}>{mockData.recommendation}</div>
  </div>
);

export default AiPredictionPanel;
