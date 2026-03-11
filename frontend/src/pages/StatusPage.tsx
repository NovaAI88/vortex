import React, { useEffect, useState } from 'react';
import StatusCard from '../components/StatusCard';
import { fetchStatus } from '../api/apiClient';

const StatusPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchStatus()
      .then(setStatus)
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ marginTop: 0, marginBottom: 24, fontSize: '2rem', fontWeight: 700, letterSpacing: '-1px' }}>Backend Service Monitoring</h2>
      <div className="ui-card" style={{maxWidth:530}}>
        {loading ? 'Loading status...' : error ? <div style={{color:'#f95e5e',fontWeight:600}}>Error: {error}</div> : status ? <StatusCard {...status} /> : <div className="ui-card ui-card-empty">No status data available.</div>}
      </div>
    </div>
  );
};

export default StatusPage;
