import React, { useState } from 'react';
import PageHeaderBar from '../components/ui/PageHeaderBar';
import SectionCard from '../components/ui/SectionCard';
import { runBacktest, fetchBacktestResults, waitForBacktestDone } from '../api/backtestApi';

type BacktestRow = {
  variant: string;
  trades: number;
  wins: number;
  losses: number;
  pnl: number;
  maxDrawdown?: number;
};

function toRows(payload: any): BacktestRow[] {
  if (Array.isArray(payload?.results)) return payload.results;
  const result = payload?.result ?? payload;
  if (!result || !result.summary) return [];

  const rows: BacktestRow[] = [];
  const summary = result.summary;
  rows.push({
    variant: 'ALL',
    trades: Number(summary.totalTrades || 0),
    wins: Number(summary.wins || 0),
    losses: Number(summary.losses || 0),
    pnl: Number(summary.totalPnL || 0),
    maxDrawdown: typeof result.maxDrawdown === 'number' ? result.maxDrawdown : undefined,
  });

  if (Array.isArray(result.byStrategy)) {
    result.byStrategy.forEach((entry: any) => {
      const metrics = entry?.metrics;
      if (!metrics) return;
      rows.push({
        variant: String(entry?.strategyId || 'strategy'),
        trades: Number(metrics.totalTrades || 0),
        wins: Number(metrics.wins || 0),
        losses: Number(metrics.losses || 0),
        pnl: Number(metrics.totalPnL || 0),
      });
    });
  }
  return rows;
}

export default function BacktestPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [lastRunAt, setLastRunAt] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    try {
      await runBacktest(['v1', 'v2', 'v3']);
      await waitForBacktestDone();
      const data = await fetchBacktestResults();
      const rows = toRows(data);
      setResults(rows);
      if (!rows.length) {
        setError('Backtest completed but returned no tabular results');
      }
      setLastRunAt(new Date().toISOString());
    } catch (e: any) {
      setResults([]);
      setError(e?.message || 'Backtest engine not yet connected');
    } finally {
      setLoading(false);
    }
  };

  const totals = results.reduce((acc: any, r: any) => ({
    trades: acc.trades + Number(r?.trades || 0),
    wins: acc.wins + Number(r?.wins || 0),
    losses: acc.losses + Number(r?.losses || 0),
    pnl: acc.pnl + Number(r?.pnl || 0),
  }), { trades: 0, wins: 0, losses: 0, pnl: 0 });

  return (
    <div>
      <PageHeaderBar
        title="Backtest Terminal"
        subtitle="Only real backtest engine responses are displayed"
        status={error ? 'critical' : 'info'}
        statusLabel={error ? 'DISCONNECTED' : 'ON DEMAND'}
        activeSymbol="BACKTEST"
        timestamp={lastRunAt || undefined}
      />

      <SectionCard title="Backtest Engine">
        <button onClick={run} disabled={loading} style={{ marginBottom: 12, background: '#23272B', color: '#eee', padding: '8px 18px', borderRadius: 6, border: '1px solid #333' }}>
          {loading ? 'Running…' : 'Run Backtest'}
        </button>
        <div style={{ fontSize: 12, color: '#a8bbdb', marginBottom: 10 }}>Last run: {lastRunAt ? new Date(lastRunAt).toLocaleString() : 'not run yet'}</div>

        {error ? <div style={{ color: '#ffb8b8' }}>{error}</div> : null}
        {!error && !loading && !results.length ? <div style={{ color: '#9cb1d3' }}>Run backtest to see results.</div> : null}

        {results.length ? (
          <table className="ui-table" style={{ width: '100%', marginTop: 10 }}>
            <thead>
              <tr><th>Variant</th><th>Trades</th><th>Wins</th><th>Losses</th><th>Win Rate</th><th>PnL</th><th>Drawdown</th></tr>
            </thead>
            <tbody>
              {results.map((r: any, i: number) => {
                const trades = Number(r?.trades || 0);
                const wins = Number(r?.wins || 0);
                const winRate = trades > 0 ? (wins / trades) * 100 : 0;
                return (
                  <tr key={i}>
                    <td>{r.variant || '—'}</td>
                    <td>{r.trades ?? '—'}</td>
                    <td>{r.wins ?? '—'}</td>
                    <td>{r.losses ?? '—'}</td>
                    <td>{winRate.toFixed(1)}%</td>
                    <td>{typeof r.pnl === 'number' ? r.pnl.toFixed(2) : '—'}</td>
                    <td>{typeof r.maxDrawdown === 'number' ? r.maxDrawdown.toFixed(2) : '—'}</td>
                  </tr>
                );
              })}
              <tr>
                <td><b>Total</b></td><td>{totals.trades}</td><td>{totals.wins}</td><td>{totals.losses}</td><td>{totals.trades ? ((totals.wins / totals.trades) * 100).toFixed(1) : '0.0'}%</td><td>{totals.pnl.toFixed(2)}</td><td>—</td>
              </tr>
            </tbody>
          </table>
        ) : null}
      </SectionCard>
    </div>
  );
}
