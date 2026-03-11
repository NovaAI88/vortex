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

  return (
    <div>
      <h2 style={{marginTop:0, fontWeight:700, fontSize:'2rem',letterSpacing:'-1px'}}>Open Positions</h2>
      <div className="ui-card" style={{overflowX:'auto'}}>
        {loading
          ? 'Loading positions...'
          : error
          ? <div style={{color:'#f95e5e',fontWeight:600}}>Error: {error}</div>
          : <PositionTable positions={positions} />}
      </div>
    </div>
  );
};

export default PositionPage;
