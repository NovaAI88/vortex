import React, { useEffect, useState } from 'react';
import StatusCard from '../components/StatusCard';
import { fetchStatus } from '../api/apiClient';

const StatusPage: React.FC = () => {
  const [status, setStatus] = useState<any>(null);
  const [error, setError] = useState(null);
  useEffect(() => { fetchStatus().then(setStatus).catch(setError); }, []);
  if(error) return <div>Error: {String(error)}</div>;
  if(!status) return <div>Loading...</div>;
  return <StatusCard status={status} />;
};
export default StatusPage;
