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

  if (loading) return <div>Loading status...</div>;
  if (error) return <div style={{color:'red'}}>Error: {error}</div>;

  return <div>{status ? <StatusCard {...status} /> : <div>No status data available.</div>}</div>;
};

export default StatusPage;
