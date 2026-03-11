import React from 'react';

const PositionTable: React.FC<{ position: any }> = ({ position }) => (
  <table border="1" style={{margin:16}}>
    <thead><tr><th>Symbol</th><th>Qty</th><th>Side</th><th>Last ExecId</th><th>Timestamp</th></tr></thead>
    <tbody>
      <tr>
        <td>{position.symbol}</td>
        <td>{position.qty}</td>
        <td>{position.side}</td>
        <td>{position.sourceExecutionResultId}</td>
        <td>{position.timestamp}</td>
      </tr>
    </tbody>
  </table>
);
export default PositionTable;
