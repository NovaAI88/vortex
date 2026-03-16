import React from 'react';

type DataTableCardProps = {
  title: string;
  children: React.ReactNode;
  actionSlot?: React.ReactNode;
};

const DataTableCard: React.FC<DataTableCardProps> = ({ title, children, actionSlot }) => {
  return (
    <div className="ui-card ui-table-card" style={{ marginBottom: 0, padding: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div style={{ fontSize: 15, color: '#cde4ff', fontWeight: 700, letterSpacing: '0.01em' }}>{title}</div>
        {actionSlot ? <div>{actionSlot}</div> : null}
      </div>
      <div style={{ overflowX: 'auto' }}>{children}</div>
    </div>
  );
};

export default DataTableCard;
