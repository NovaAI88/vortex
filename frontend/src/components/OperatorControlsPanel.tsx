import React, { useState, useEffect } from 'react';
import { fetchEnginePanelState, pauseEngine, resumeEngine, resetPortfolio as backendResetPortfolio } from '../api/enginePanelApi';

const BUTTON_STYLE = {
  background: 'linear-gradient(90deg,#242e3e 80%,#233f5a 120%)',
  color: '#bae8fa',
  fontWeight: 700,
  fontSize: '1.1rem',
  border: '1.6px solid #2988b9',
  borderRadius: '10px',
  padding: '11px 24px',
  margin: '0 10px 0 0',
  outline: 'none',
  boxShadow: '0 1px 6px #1e425930',
  cursor: 'pointer',
  minWidth: 115,
};

const SELECTED_STYLE = {
  ...BUTTON_STYLE,
  background: 'linear-gradient(90deg,#2bbfe4 40%,#2173a2 120%)',
  color: '#f3fcff',
  border: '1.6px solid #2bbfe4',
};

const OperatorControlsPanel: React.FC = () => {
  const [tradingPaused, setTradingPaused] = useState(false);
  const [resetPending, setResetPending] = useState(false);
  const [variant, setVariant] = useState<'v1'|'v2'|'v3'>('v1');
  const [engineMode, setEngineMode] = useState<string>('PAPER_TRADING');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string|null>(null);

  useEffect(() => {
    setLoading(true);
    fetchEnginePanelState().then(res => {
      setTradingPaused(!!res.paused);
      setVariant(res.activeVariant || 'v1');
      setEngineMode(res.mode || 'PAPER_TRADING');
      setErr(null);
    }).catch(() => {
      setErr('Engine state unavailable');
      setTradingPaused(false);
      setVariant('v1');
      setEngineMode('–––');
    }).finally(() => setLoading(false));
  }, []);

  const [actionLoading, setActionLoading] = useState<'pause'|'resume'|null>(null);
  const [actionError, setActionError] = useState<string|null>(null);
  const pauseTrading = async () => {
    setActionLoading('pause'); setActionError(null);
    try {
      await pauseEngine();
      await reloadEngineState();
    } catch(e) { setActionError('Pause failed'); }
    setActionLoading(null);
  };
  const resumeTrading = async () => {
    setActionLoading('resume'); setActionError(null);
    try {
      await resumeEngine();
      await reloadEngineState();
    } catch(e) { setActionError('Resume failed'); }
    setActionLoading(null);
  };
  const [resetError, setResetError] = useState<string|null>(null);
  const resetPortfolio = async () => {
    setResetPending(true);
    setResetError(null);
    try {
      await backendResetPortfolio();
      await reloadEngineState();
    } catch(e) { setResetError('Portfolio reset failed'); }
    setTimeout(()=>setResetPending(false),1000);
  };

  async function reloadEngineState() {
    setLoading(true);
    try {
      const res = await fetchEnginePanelState();
      setTradingPaused(!!res.paused);
      setVariant(res.activeVariant || 'v1');
      setEngineMode(res.mode || 'PAPER_TRADING');
      setErr(null);
    } catch { setErr('Engine state unavailable'); }
    setLoading(false);
  }

  return (
    <div style={{
      padding: '26px 22px 14px',
      background: '#151d31',
      borderRadius: 14,
      marginBottom: 16,
      boxShadow: '0 2px 12px #10243818',
      minWidth: 310,
      maxWidth: 440,
      color: '#e6faff',
      fontFamily: 'Inter, Segoe UI, Arial',
    }}>
      <div style={{fontWeight:800,fontSize:'1.25rem',color:'#88e2ff',letterSpacing:'0.1em',marginBottom:15}}>Operator Controls</div>
      {loading ? <div style={{color:'#adeaff',marginBottom:12,fontWeight:700}}>Loading engine state…</div> : null}
      <div style={{marginBottom:err ? 6 : 15, fontSize:15.2, fontWeight:700, color:'#aef'}}>
        {err && <div style={{color:'#ff7e83',fontWeight:700,marginBottom:6}}>Engine state unavailable</div>}
        <div>Engine mode: <span style={{color:'#fcc'}}>{engineMode || '?'}</span></div>
        <div>Status: <span style={{fontWeight:900,color:tradingPaused?'#ff876e':'#68facb'}}>{tradingPaused?'Paused':'Active'}</span></div>
        <div>Variant: <span style={{fontWeight:900,color:'#bcf'}}>{variant.toUpperCase()}</span></div>
      </div>
      <div style={{display:'flex',alignItems:'center',marginBottom:17,gap:10}}>
        <button
          style={tradingPaused ? BUTTON_STYLE : SELECTED_STYLE}
          disabled={!tradingPaused || actionLoading==='resume' || loading}
          onClick={resumeTrading}
        >{actionLoading==='resume' ? 'Resuming…' : 'Resume Trading'}</button>
        <button
          style={tradingPaused ? SELECTED_STYLE : BUTTON_STYLE}
          disabled={tradingPaused || actionLoading==='pause' || loading}
          onClick={pauseTrading}
        >{actionLoading==='pause' ? 'Pausing…' : 'Pause Trading'}</button>
        <button
          style={{...BUTTON_STYLE,background:'#ad312c',border:'1.7px solid #bf5454',color:'#fff6f6',opacity:resetPending?0.6:1}}
          onClick={resetPortfolio}
          disabled={resetPending || loading}
        >{resetPending ? 'Reset…' : 'Reset Paper Portfolio'}</button>
      </div>
      {actionError && <div style={{color:'#ff8585',marginBottom:7,marginTop:-10,fontWeight:700}}>{actionError}</div>}
      {resetError && <div style={{color:'#fff397',marginBottom:7,fontWeight:700}}>{resetError}</div>}


      <div style={{marginTop:12,marginBottom:3,fontWeight:700,fontSize:15,color:'#8be7fa'}}>Variant Toggle</div>
      <div style={{display:'flex',gap:16,marginBottom:6,alignItems:'center'}}>
        {['v1','v2','v3'].map((v)=>
          <button key={v} style={variant===v?SELECTED_STYLE:BUTTON_STYLE} disabled title="Pending backend wiring">{v.toUpperCase()}</button>
        )}
      </div>
      <div style={{marginTop:12, opacity:0.81, fontSize:14.5, fontWeight:500, color:'#d2ebfd'}}>Live state connected. Control actions pending backend wiring.</div>
    </div>
  );
};

export default OperatorControlsPanel;
