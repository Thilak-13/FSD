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
        return 'var(--spectrum-global-color-green-700, #2680eb)';
      case 'negative':
        return 'var(--spectrum-global-color-red-600, #d7373f)';
      case 'notice':
        return 'var(--spectrum-global-color-orange-700, #e68619)';
      default:
        return 'var(--spectrum-global-color-gray-600, #747474)';
    }
  };

  return (
    <div className="summary-card" data-testid={id}>
      <div className="summary-card-header">
        <h3 className="summary-card-title">{title}</h3>
        {icon && <div aria-hidden="true">{icon}</div>}
      </div>
      <div className="summary-card-value">{value}</div>
      {(subtitle || trend) && (
        <div className="summary-card-sub">
          {trend && (
            <span
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
  );
};
