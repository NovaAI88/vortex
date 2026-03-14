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
      .then((resp) => {
        // If error object returned instead of array, set backend error
        if (resp && typeof resp === 'object' && !Array.isArray(resp) && resp.error) {
          setError(resp.error);
          setPositions([]);
        } else {
          setPositions(resp || []);
          setError(null);
        }
      })
      .catch((err) => setError(String(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{marginTop:0, fontWeight:700, fontSize:'2rem',letterSpacing:'-1px'}}>Open Positions</h2>
      <div className="ui-card" style={{overflowX:'auto'}}>
        {loading
          ? 'Loading positions...'
          : <PositionTable positions={positions} backendError={error || undefined} />}
      </div>
    </div>
  );
};

export default PositionPage;
