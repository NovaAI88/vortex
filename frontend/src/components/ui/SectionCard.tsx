import React from 'react';

type SectionCardProps = {
  title: string;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, actionSlot, children }) => {
  return (
    <div className="ui-card ui-section-card" style={{ marginBottom: 0, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#cde4ff', fontWeight: 700, letterSpacing: '0.01em' }}>{title}</h3>
        {actionSlot ? <div>{actionSlot}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
};

export default SectionCard;
