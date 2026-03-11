import React, { useEffect, useState } from 'react';
import PositionTable from '../components/PositionTable';
import { fetchPositions } from '../api/apiClient';

const PositionPage: React.FC = () => {
  const [positions, setPositions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetchPositions()
      .then((resp) => setPositions(resp || []))
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading positions...</div>;
  if (error) return <div style={{color:'red'}}>Error: {error}</div>;

  return <PositionTable positions={positions} />;
};

export default PositionPage;
