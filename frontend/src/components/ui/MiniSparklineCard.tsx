import React from 'react';

const buildPath = (values: number[], width: number, height: number) => {
  if (!values.length) return '';
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  return values
    .map((v, i) => {
      const x = (i / Math.max(values.length - 1, 1)) * width;
      const y = height - ((v - min) / span) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
};

type MiniSparklineCardProps = {
  title: string;
  value: string | number;
  points: number[];
  stroke?: string;
};

const MiniSparklineCard: React.FC<MiniSparklineCardProps> = ({
  title,
  value,
  points,
  stroke = '#47e5ff',
}) => {
  const width = 220;
  const height = 48;
  const path = buildPath(points, width, height);

  return (
    <div className="ui-card ui-sparkline-card" style={{ marginBottom: 0, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#8fa3c8', fontWeight: 600 }}>{title}</span>
        <span style={{ fontWeight: 800, color: '#eaf1ff', fontSize: 16 }}>{value}</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height="50" preserveAspectRatio="none">
        <path d={path} fill="none" stroke={stroke} strokeWidth="2.2" />
      </svg>
    </div>
  );
};

export default MiniSparklineCard;
