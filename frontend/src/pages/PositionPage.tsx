import React, { useEffect, useState } from 'react';
import PositionTable from '../components/PositionTable';
import { fetchPosition } from '../api/apiClient';

const PositionPage: React.FC = () => {
  const [position, setPosition] = useState<any>(null);
  const [error, setError] = useState(null);
  useEffect(() => { fetchPosition().then(setPosition).catch(setError); }, []);
  if(error) return <div>Error: {String(error)}</div>;
  if(!position) return <div>Loading...</div>;
  return <PositionTable position={position} />;
};
export default PositionPage;
