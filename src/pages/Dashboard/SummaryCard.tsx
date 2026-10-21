// src/pages/Dashboard/SummaryCard.tsx
import React from 'react';

export interface SummaryCardProps {
  id: string;
  title: string;
  value: string;
  subtitle?: string;
  trend?: string;
  trendType?: 'positive' | 'notice' | 'negative' | 'neutral';
  icon?: React.ReactNode;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({
  id,
  title,
  value,
  subtitle,
  trend,
  trendType = 'neutral',
  icon,
}) => {
  const getTrendColor = () => {
    switch (trendType) {
      case 'positive':
        return 'var(--spectrum-positive-visual-color, #008132)';
      case 'negative':
        return 'var(--spectrum-negative-visual-color, #d7373f)';
      case 'notice':
        return 'var(--spectrum-notice-visual-color, #e68619)';
      default:
        return 'var(--spectrum-global-color-gray-600, #747474)';
    }
  };

  return (
    <div className="summary-card" data-testid={id}>
      <div className="summary-card-header">
        <span className="summary-card-title">{title}</span>
        {icon && (
          <div className="summary-card-icon" aria-hidden="true">
            {icon}
          </div>
        )}
      </div>
      <div className="summary-card-body">
        <div className="summary-card-value">{value}</div>
        {(subtitle || trend) && (
          <div className="summary-card-sub">
            {trend && (
              <span
                className="summary-card-trend"
                style={{
                  color: getTrendColor(),
                  fontWeight: 600,
                  marginRight: '6px',
                }}
              >
                {trend}
              </span>
            )}
            {subtitle}
          </div>
        )}
      </div>
    </div>
  );
};
