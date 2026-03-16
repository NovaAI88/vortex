import React from 'react';

type KpiCardProps = {
  label: string;
  value: string | number;
  delta?: string;
  tone?: 'positive' | 'negative' | 'neutral';
};

const KpiCard: React.FC<KpiCardProps> = ({ label, value, delta, tone = 'neutral' }) => {
  const deltaColor = tone === 'positive' ? '#7fee82' : tone === 'negative' ? '#ff9f9f' : '#b7c7e8';

  return (
    <div className="ui-card ui-kpi-card" style={{ marginBottom: 0, padding: 16 }}>
      <div style={{ fontSize: 12, color: '#8fa3c8', marginBottom: 6, fontWeight: 600, letterSpacing: '0.02em' }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: '#eef4ff', lineHeight: 1.15, letterSpacing: '-0.01em' }}>{value}</div>
      {delta ? <div style={{ marginTop: 6, fontSize: 12, color: deltaColor, fontWeight: 700 }}>{delta}</div> : null}
    </div>
  );
};

export default KpiCard;
