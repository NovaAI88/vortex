import React, { useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import SectionCard from '../components/ui/SectionCard';
import { runBacktest, fetchBacktestResults } from '../api/backtestApi';

export default function BacktestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await runBacktest(['v1', 'v2', 'v3']);
      const data = await fetchBacktestResults();
      setResults(Array.isArray(data?.results) ? data.results : []);
    } catch (e: any) {
      setResults([]);
      setError(e?.message || 'Backtest engine not yet connected');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeaderBar
        title="Backtest Terminal"
        subtitle="Only real backtest engine responses are displayed"
        status={error ? 'critical' : 'info'}
        statusLabel={error ? 'DISCONNECTED' : 'ON DEMAND'}
        activeSymbol="BACKTEST"
      />

      <SectionCard title="Backtest Engine">
        <button onClick={run} disabled={loading} style={{ marginBottom: 12, background: '#23272B', color: '#eee', padding: '8px 18px', borderRadius: 6, border: '1px solid #333' }}>
          {loading ? 'Running…' : 'Run Backtest'}
        </button>

        {error ? <div style={{ color: '#ffb8b8' }}>{error}</div> : null}
        {!error && !loading && !results.length ? <div style={{ color: '#9cb1d3' }}>Backtest engine not yet connected or no results available.</div> : null}

        {results.length ? (
          <table className="ui-table" style={{ width: '100%', marginTop: 10 }}>
            <thead>
              <tr><th>Variant</th><th>Trades</th><th>Wins</th><th>Losses</th><th>PnL</th><th>Drawdown</th></tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => (
                <tr key={i}>
                  <td>{r.variant || '—'}</td>
                  <td>{r.trades ?? '—'}</td>
                  <td>{r.wins ?? '—'}</td>
                  <td>{r.losses ?? '—'}</td>
                  <td>{typeof r.pnl === 'number' ? r.pnl.toFixed(2) : '—'}</td>
                  <td>{typeof r.maxDrawdown === 'number' ? r.maxDrawdown.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : null}
      </SectionCard>
    </div>
  );
}
