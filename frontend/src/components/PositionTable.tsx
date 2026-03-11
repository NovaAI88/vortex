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

const PositionTable: React.FC<PositionTableProps> = ({ positions }) => (
  <div style={{ border: '1px solid #eee', borderRadius: 6, padding: '1rem', background: '#f4f8ff' }}>
    <h2>Positions</h2>
    {positions.length === 0 ? (
      <p style={{ color: '#888' }}>No positions open.</p>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'left' }}>Symbol</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'right' }}>Quantity</th>
            <th style={{ borderBottom: '1px solid #ccc', textAlign: 'right' }}>Entry Price</th>
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
