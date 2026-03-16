import React from 'react';

type HealthState = 'healthy' | 'warning' | 'critical' | 'info';

type HealthBadgeProps = {
  state: HealthState;
  label?: string;
};

const colorByState: Record<HealthState, { text: string; bg: string; border: string }> = {
  healthy: { text: '#7fee82', bg: '#132818', border: '#2f5a39' },
  warning: { text: '#ffd67a', bg: '#2a220f', border: '#5f4a1d' },
  critical: { text: '#ff9f9f', bg: '#2c1313', border: '#663232' },
  info: { text: '#8ec5ff', bg: '#132236', border: '#2e4b73' },
};

const HealthBadge: React.FC<HealthBadgeProps> = ({ state, label }) => {
  const c = colorByState[state];
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: c.text,
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 999,
        padding: '4px 9px',
        letterSpacing: '.25px',
      }}
    >
      {label || state.toUpperCase()}
    </span>
  );
};

export default HealthBadge;
