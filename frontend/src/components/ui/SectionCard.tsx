import React from 'react';

type SectionCardProps = {
  title: string;
  actionSlot?: React.ReactNode;
  children: React.ReactNode;
};

const SectionCard: React.FC<SectionCardProps> = ({ title, actionSlot, children }) => {
  return (
    <div className="ui-card" style={{ marginBottom: 0, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <h3 style={{ margin: 0, fontSize: 15, color: '#cde4ff', fontWeight: 700 }}>{title}</h3>
        {actionSlot ? <div>{actionSlot}</div> : null}
      </div>
      <div>{children}</div>
    </div>
  );
};

export default SectionCard;
