import React from 'react';
import AiPredictionPanel from '../components/AiPredictionPanel';
import ConfidenceMeter from '../components/ConfidenceMeter';

const ai = {
  prediction: "Long (Buy)",
  bias: "Bullish",
  confidence: 0.82,
  entry: "67010.00",
  stop: "66880.00",
  take_profit: "67400.00",
  reasoning: "The BTC price action shows a clear bullish structure on the 1H timeframe, supported by strong volume and positive momentum. Entry above recent swing is preferred. Risk flag is moderate due to volatility cycle. Uptrend confirmation from RSI & market structure."
};

const AiAnalysisPage: React.FC = () => (
  <div style={{padding:'42px 0 0 14px',maxWidth:890,margin:'0 auto'}}>
    <h2 style={{fontSize:'2.17rem',color:'#84eefd',fontWeight:800,letterSpacing:'0.02em',marginBottom:12}}>AI Trade Analysis</h2>
    <AiPredictionPanel />
    <ConfidenceMeter confidence={ai.confidence} />
    <div style={{margin:'26px 0 0 4px',padding:'20px 24px',background:'#1c232f',borderRadius:10,boxShadow:'0 1px 4px #0003',color:'#e3eeff',fontSize:16.5,fontWeight:600,letterSpacing:'0.01em'}}>
      <div style={{color:'#aae3ff',fontSize:16.7,fontWeight:800,marginBottom:7}}>Reasoning</div>
      {ai.reasoning}
    </div>
    <div style={{margin:'17px 0 14px 4px',fontSize:16.3,color:'#93ffd4',fontWeight:600}}>
      <span>Entry: <span style={{color:'#81ffe9',fontWeight:700}}>{ai.entry}</span></span>
      <span style={{marginLeft:28}}>Stop: <span style={{color:'#fa6f88',fontWeight:700}}>{ai.stop}</span></span>
      <span style={{marginLeft:28}}>Take Profit: <span style={{color:'#90c3fd',fontWeight:700}}>{ai.take_profit}</span></span>
    </div>
  </div>
);

export default AiAnalysisPage;
