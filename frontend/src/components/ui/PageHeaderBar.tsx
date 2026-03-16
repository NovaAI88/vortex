import React from 'react';
import HealthBadge from './HealthBadge';

type PageHeaderBarProps = {
  title: string;
  subtitle?: string;
  status?: 'healthy' | 'warning' | 'critical' | 'info';
  statusLabel?: string;
  activeSymbol?: string;
  timestamp?: string;
};

const PageHeaderBar: React.FC<PageHeaderBarProps> = ({
  title,
  subtitle,
  status = 'info',
  statusLabel = 'Live',
  activeSymbol = 'BTCUSDT',
  timestamp,
}) => {
  const ts = timestamp || new Date().toISOString();

  return (
    <div className="ui-card" style={{ marginBottom: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#eaf1ff', letterSpacing: '-0.4px' }}>{title}</div>
          {subtitle ? <div style={{ fontSize: 13, color: '#9db0cf', marginTop: 4 }}>{subtitle}</div> : null}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <HealthBadge state={status} label={statusLabel} />
          <span style={{ fontSize: 12, color: '#7ec4ee', border: '1px solid #2f3b54', borderRadius: 999, padding: '4px 8px' }}>
            {activeSymbol}
          </span>
          <span style={{ fontSize: 12, color: '#8f9ab5' }}>{new Date(ts).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

export default PageHeaderBar;
