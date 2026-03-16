import React from 'react';

type InsightCardProps = {
  title: string;
  text: string;
  source?: string;
};

const InsightCard: React.FC<InsightCardProps> = ({ title, text, source }) => {
  return (
    <div className="ui-card" style={{ marginBottom: 0, padding: '12px 14px' }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#dce8ff', marginBottom: 8 }}>{title}</div>
      <div style={{ fontSize: 13, lineHeight: 1.5, color: '#b7c5df' }}>{text}</div>
      {source ? <div style={{ marginTop: 8, fontSize: 11, color: '#7e93b8' }}>Source: {source}</div> : null}
    </div>
  );
};

export default InsightCard;
