import React from 'react';
import { StatusLightVariant } from '../../types';

/**
 * Maps invoice, payment, PO, or vendor status string to StatusLight variant
 */
export function getStatusVariant(status?: string): StatusLightVariant {
  if (!status) return 'info';
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case 'approved':
    case 'paid':
    case 'active':
    case 'fulfilled':
    case 'closed':
      return 'positive';

    case 'submitted':
    case 'under verification':
    case 'payment scheduled':
    case 'under review':
    case 'partially invoiced':
      return 'notice';

    case 'flagged':
    case 'overdue':
    case 'inactive':
      return 'negative';

    case 'open':
    case 'info':
    default:
      return 'info';
  }
}

export interface StatusBadgeProps {
  status?: string;
  variant?: StatusLightVariant;
  label?: string;
  size?: 's' | 'm' | 'l' | 'xl';
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * Accessible StatusBadge using standard React and HTML5 elements.
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  size = 'm',
  disabled,
  className,
  children,
}) => {
  const effectiveVariant = variant || getStatusVariant(status);
  const content = label || children || status || '';

  const getDotColor = (v: StatusLightVariant) => {
    switch (v) {
      case 'positive':
        return 'var(--spectrum-global-color-green-600, #2680eb)';
      case 'negative':
        return 'var(--spectrum-global-color-red-600, #d7373f)';
      case 'notice':
        return 'var(--spectrum-global-color-orange-600, #e68619)';
      case 'info':
      default:
        return 'var(--spectrum-global-color-gray-600, #8e8e8e)';
    }
  };

  return (
    <span
      role="status"
      className={`status-badge status-badge-${effectiveVariant} ${className || ''}`.trim()}
      data-variant={effectiveVariant}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: size === 's' ? '12px' : '14px',
        fontWeight: 500,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: getDotColor(effectiveVariant),
          flexShrink: 0,
        }}
      />
      {content}
    </span>
  );
};
