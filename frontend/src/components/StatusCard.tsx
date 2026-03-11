import React from 'react';

type StatusCardProps = {
  service: string;
  status: string;
  time: string;
  [key: string]: any;
};

const StatusCard: React.FC<StatusCardProps> = (props) => (
  <div style={{ border: '1px solid #eee', borderRadius: 6, padding: '1rem', marginBottom: '1rem', background: props.status === 'OK' ? '#e6ffe6' : '#fffbe6' }}>
    <h2>Status</h2>
    <p><b>Service:</b> {props.service}</p>
    <p><b>Status:</b> <span style={{ color: props.status === 'OK' ? 'green' : 'orange' }}>{props.status}</span></p>
    <p><b>Timestamp:</b> {props.time}</p>
    {/* Render any other fields present */}
    {Object.entries(props).map(([key, value]) => (
      !['service', 'status', 'time'].includes(key) && (
        <p key={key}><b>{key}:</b> {value as string}</p>
      )
    ))}
  </div>
);

export default StatusCard;
