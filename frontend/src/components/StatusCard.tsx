import React from 'react';

const StatusCard: React.FC<{ status: any }> = ({ status }) => (
  <div style={{border:'1px solid #ddd', borderRadius:8, padding:16, margin:16}}>
    <h2>System Status</h2>
    <div><b>Status:</b> {status.status}</div>
    <div><b>Uptime:</b> {Math.round(status.uptime)}s</div>
    <div><b>Timestamp:</b> {status.timestamp}</div>
    <div><b>Build:</b> {status.build}</div>
  </div>
);
export default StatusCard;
