import React, { useState } from 'react';
import { runBacktest, fetchBacktestResults } from '../api/backtestApi';
import { EquityCurveChart } from '../components/EquityCurveChart';
import { DrawdownChart } from '../components/DrawdownChart';

interface BacktestResult {
  variant: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  maxDrawdown: number;
  equityCurve: number[];
}

export default function BacktestPage() {
  const [results, setResults] = useState<BacktestResult[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    setLoading(true);
    try {
      await runBacktest(['v1','v2','v3']);
      const data = await fetchBacktestResults();
      setResults(data.results || []);
      setSelected(data.results ? data.results.map((r:any) => r.variant) : []);
    } catch (e) {
      setResults([]);
      setSelected([]);
    }
    setLoading(false);
  };

  const handleToggle = (variant: string) => {
    setSelected(sel => sel.includes(variant)
      ? sel.filter(v => v !== variant)
      : [...sel, variant]);
  };

  const chartCurves = results.filter(r => selected.includes(r.variant)).map(r => ({
    variant: r.variant,
    equityCurve: r.equityCurve,
  }));

  return (
    <div style={{ padding: 32, background: '#151718', minHeight: '100vh'}}>
      <h2 style={{ color: '#d1d5db', fontFamily: 'monospace' }}>Backtesting</h2>
      <button onClick={handleRun} disabled={loading} style={{ marginBottom: 12, background:'#23272B',color:'#eee',padding:'8px 24px',fontFamily:'monospace',borderRadius:6,border:'1px solid #333'}}>
        {loading ? 'Running...' : 'Run Backtest'}
      </button>
      <div style={{margin:'16px 0'}}>
        <span style={{color:'#888',fontSize:14,fontFamily:'monospace',marginRight:8}}>Show curves for:</span>
        {results.map(r => (
          <label key={r.variant} style={{marginRight:14,color:selected.includes(r.variant)?'#fbf62e':'#eee',cursor:'pointer'}}>
            <input
              type="checkbox"
              checked={selected.includes(r.variant)}
              onChange={() => handleToggle(r.variant)}
              style={{marginRight:4}}
            />{r.variant}
          </label>
        ))}
      </div>
      {chartCurves.length > 0 && <EquityCurveChart curves={chartCurves} />}
      {chartCurves.length > 0 && <DrawdownChart curves={chartCurves} />}
      <div style={{ background: '#202124', borderRadius: 8, padding: 18, marginTop: 24 }}>
        <h4 style={{color:'#9fe986', fontFamily:'monospace',margin:'0 0 12px 0'}}>Results</h4>
        <table style={{ minWidth: 400, width:'100%', color:'#c1c7d0', fontFamily:'monospace',fontSize:15 }}>
          <thead>
            <tr style={{background:'#151718', color:'#77aaff'}}>
              <th style={{textAlign:'left',padding:'6px 12px'}}>Variant</th>
              <th style={{padding:'6px 12px'}}>Trades</th>
              <th style={{padding:'6px 12px'}}>Win Rate</th>
              <th style={{padding:'6px 12px'}}>PnL</th>
              <th style={{padding:'6px 12px'}}>Drawdown</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.variant} style={{background:selected.includes(r.variant)?'#24262b':'none'}}>
                <td style={{textAlign:'left',padding:'6px 12px'}}>{r.variant}</td>
                <td style={{padding:'6px 12px'}}>{r.trades}</td>
                <td style={{padding:'6px 12px'}}>{r.wins && r.trades ? ((r.wins / r.trades) * 100).toFixed(1) + '%' : '-'}</td>
                <td style={{padding:'6px 12px'}}>{typeof r.pnl === 'number' ? r.pnl.toFixed(2) : r.pnl}</td>
                <td style={{padding:'6px 12px'}}>{typeof r.maxDrawdown === 'number' ? r.maxDrawdown.toFixed(2) : r.maxDrawdown}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
