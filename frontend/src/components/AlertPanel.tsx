import React, { useEffect, useState } from 'react';

interface Alert {
  timestamp: string;
  severity: 'info'|'warning'|'error';
  source: string;
  message: string;
}

const POLL_INTERVAL = 5000;

const AlertPanel: React.FC = () => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAlerts = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await fetchAlerts();
        setAlerts(Array.isArray(data) ? data : []);
      } catch {
        setError('No alert data');
      } finally {
        setLoading(false);
      }
    };
    fetchAlerts();
    const interval = setInterval(fetchAlerts, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ background:'#251e29',borderRadius:11,padding:'11px 11px 9px',color:'#fffea4',boxShadow:'0 1px 10px #432e1a26',minHeight:38,border:'1.1px solid #51416b',fontSize:13.5,fontWeight:600,letterSpacing:'0.01em',fontFamily:'Inter,Roboto,Arial,sans-serif', maxHeight:164, overflowY:'auto' }}>
      <div style={{fontWeight:700, fontSize:15, color:'#fc4'}}>⚠️ Alerts</div>
      {loading ? <span style={{color:'#bbb'}}>Loading…</span> : error ? <span style={{color:'#ffa8a8'}}>{error}</span> : (
        alerts.length === 0 ? <span>No alerts.</span> : (
          alerts.map((alert, i) => (
            <div key={i} style={{marginTop:4, padding:'4px 0', borderBottom:'1px solid #433b4a', color: alert.severity==='error'? '#ff8484' : alert.severity==='warning'? '#ffb970':'#f9df84'}}>
              <span style={{fontWeight:700, fontSize:13}}>{new Date(alert.timestamp).toLocaleTimeString()} </span>
              <span style={{fontWeight:500, color:'#aaa', fontSize:12}}>[{alert.source}] </span>
              <span style={{fontWeight:700}}>{alert.severity.toUpperCase()}:</span> <span style={{color:'#ffe',marginLeft:5}}>{alert.message}</span>
            </div>
          ))
        )
      )}
    </div>
  );
};
export default AlertPanel;
pan>
            </div>
          ))
        )
      )}
    </div>
  );
};
export default AlertPanel;
