import React from 'react';

type StatusCardProps = {
  service?: string;
  status?: string;
  time?: string;
  [key: string]: any;
};

const StatusCard: React.FC<StatusCardProps> = (props) => (
  <div>
    <div style={{fontSize:'1.09rem',color:'#b2bdd7',fontWeight:600,marginBottom:5}}>Status Summary</div>
    <div style={{fontWeight:700,color:props.status==='OK'? '#30e094':'#f9ad1a',fontSize:'1.35rem',marginBottom:'.92rem'}}>{props.status||'Unknown'}</div>
    <div style={{fontSize:'0.98rem',color:'#a7b0bb'}}>Service: <b style={{color:'#7f93f8'}}>{props.service}</b></div>
    <div style={{fontSize:'0.94rem',color:'#a7b0bb'}}>Timestamp: <span style={{color:'#97a0b8'}}>{props.time}</span></div>
    {Object.entries(props).map(([key, value]) => (
      !['service', 'status', 'time'].includes(key) && value && (
        <div style={{color:'#bac2ce',fontSize:'0.97rem'}} key={key}><b style={{color:'#8296c9'}}>{key}:</b> {value as string}</div>
      )
    ))}
  </div>
);

export default StatusCard;
