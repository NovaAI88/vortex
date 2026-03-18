import React from 'react';

export interface DashboardCardProps {
  /** Title displayed at the top of the card */
  title: string;
  /** Main value or content to display */
  value?: string | number;
  /** Optional subtitle or description */
  subtitle?: string;
  /** Optional icon (React node) */
  icon?: React.ReactNode;
  /** Trend indicator direction */
  trend?: 'up' | 'down' | 'neutral';
  /** Trend value to display (e.g., "+12%") */
  trendValue?: string;
  /** Optional footer content */
  footer?: React.ReactNode;
  /** Click handler */
  onClick?: () => void;
  /** Whether the card is interactive (hover effects) */
  interactive?: boolean;
  /** Additional CSS class */
  className?: string;
  /** Children for custom content (overrides value/subtitle/trend) */
  children?: React.ReactNode;
}

/**
 * A simple dashboard card component for displaying metrics.
 * Uses the existing `.ui-card` styling from theme.css.
 */
const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  footer,
  onClick,
  interactive = false,
  className = '',
  children,
}) => {
  const handleClick = () => {
    if (onClick) onClick();
  };

  const trendIcon = trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→';
  const trendColor = trend === 'up' ? '#7fee82' : trend === 'down' ? '#ff9f9f' : '#b7c7e8';

  const cardClassNames = [
    'ui-card',
    'ui-dashboard-card',
    interactive ? 'ui-dashboard-card--interactive' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={cardClassNames}
      onClick={handleClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        cursor: interactive ? 'pointer' : 'default',
        transition: interactive ? 'box-shadow 0.2s ease, transform 0.2s ease' : 'none',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: '#8fa3c8', fontWeight: 600, letterSpacing: '0.02em' }}>
          {title}
        </h3>
        {icon && <div style={{ fontSize: 18, color: '#7f93f8' }}>{icon}</div>}
      </div>

      {children ? (
        <div>{children}</div>
      ) : (
        <>
          {value !== undefined && (
            <div style={{ fontSize: 24, fontWeight: 800, color: '#eef4ff', lineHeight: 1.15, letterSpacing: '-0.01em', marginBottom: 4 }}>
              {value}
            </div>
          )}
          {subtitle && (
            <div style={{ fontSize: 13, color: '#b7c5df', marginBottom: 8 }}>{subtitle}</div>
          )}
          {(trend || trendValue) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
              {trend && (
                <span style={{ fontSize: 16, fontWeight: 700, color: trendColor }}>{trendIcon}</span>
              )}
              {trendValue && (
                <span style={{ fontSize: 12, fontWeight: 700, color: trendColor }}>{trendValue}</span>
              )}
            </div>
          )}
        </>
      )}

      {footer && (
        <div style={{ marginTop: 16, paddingTop: 12, borderTop: '1px solid #263a5a', fontSize: 11, color: '#7e93b8' }}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default DashboardCard;