import React from 'react';

type MetricGridProps = {
  children: React.ReactNode;
  minCardWidth?: number;
};

const MetricGrid: React.FC<MetricGridProps> = ({ children, minCardWidth = 220 }) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minCardWidth}px, 1fr))`,
        gap: 12,
        width: '100%',
      }}
    >
      {children}
    </div>
  );
};

export default MetricGrid;
