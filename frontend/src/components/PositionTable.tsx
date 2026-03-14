import React from 'react';

type Position = {
  id: string;
  symbol: string;
  qty: number;
  entryPrice: number;
  [key: string]: any;
};

type PositionTableProps = {
  positions: Position[];
};

const PositionTable: React.FC<PositionTableProps & { backendError?: string }> = ({ positions, backendError }) => (
  <div>
    {backendError ? (
      <div className="ui-card ui-card-empty" style={{color:'#c94'}}>Position data not available (backend error)</div>
    ) : positions.length === 0 ? (
      <div className="ui-card ui-card-empty">No positions open.</div>
    ) : (
      <table className="data-table">
        <thead>
          <tr>
            <th>Symbol</th>
            <th style={{textAlign:'right'}}>Quantity</th>
            <th style={{textAlign:'right'}}>Entry Price</th>
          </tr>
        </thead>
        <tbody>
          {positions.map(pos => (
            <tr key={pos.id || pos.symbol}>
              <td>{pos.symbol}</td>
              <td style={{ textAlign: 'right' }}>{pos.qty}</td>
              <td style={{ textAlign: 'right' }}>${pos.entryPrice.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )}
  </div>
);

export default PositionTable;
