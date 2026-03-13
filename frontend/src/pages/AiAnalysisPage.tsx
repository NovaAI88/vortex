import React, { useEffect, useState } from 'react';
import AiPredictionPanel from '../components/AiPredictionPanel';
import ConfidenceMeter from '../components/ConfidenceMeter';
import { fetchSignals } from '../api/apiClient';

const AiAnalysisPage: React.FC = () => {
  const [confidence, setConfidence] = useState<number|null>(null);
  const [reasoning, setReasoning] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchSignals()
      .then(signals => {
        if (!mounted) return;
        const sig = signals && signals[0];
        setConfidence(typeof sig?.confidence === 'number' ? sig.confidence : null);
        setReasoning(sig?.rationale || '');
      })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div style={{padding:'42px 0 0 14px',maxWidth:890,margin:'0 auto'}}>
      <h2 style={{fontSize:'2.17rem',color:'#84eefd',fontWeight:800,letterSpacing:'0.02em',marginBottom:12}}>AI Trade Analysis</h2>
      <AiPredictionPanel />
      {confidence !== null && <ConfidenceMeter confidence={confidence} />}
      <div style={{margin:'26px 0 0 4px',padding:'20px 24px',background:'#1c232f',borderRadius:10,boxShadow:'0 1px 4px #0003',color:'#e3eeff',fontSize:16.5,fontWeight:600,letterSpacing:'0.01em'}}>
        <div style={{color:'#aae3ff',fontSize:16.7,fontWeight:800,marginBottom:7}}>Reasoning</div>
        {loading ? 'Loading…' : (reasoning || <span style={{color:'#757e94'}}>No reasoning available.</span>)}
      </div>
    </div>
  );
};

export default AiAnalysisPage;
