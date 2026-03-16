import React from 'react';

type KpiStripProps = {
  children: React.ReactNode;
};

const KpiStrip: React.FC<KpiStripProps> = ({ children }) => {
  return <div className="ui-kpi-strip">{children}</div>;
};

export default KpiStrip;
