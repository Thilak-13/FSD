import React from 'react';
import { StatusLight } from '@swc-react/status-light';
import { StatusLightVariant } from '../../types';

/**
 * Maps invoice, payment, PO, or vendor status string to Spectrum StatusLight variant
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
 * StatusBadge wraps <sp-status-light> from @swc-react/status-light.
 * Never uses <sp-badge> for status, as <sp-badge> is strictly reserved for count indicators.
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
  const lightRef = React.useRef<any>(null);

  React.useEffect(() => {
    if (lightRef.current && typeof lightRef.current.setAttribute === 'function') {
      lightRef.current.setAttribute('variant', effectiveVariant);
    }
  }, [effectiveVariant]);

  return (
    <StatusLight
      ref={lightRef}
      variant={effectiveVariant}
      size={size}
      disabled={disabled}
      className={className}
      role="status"
    >
      {content}
    </StatusLight>
  );
};
