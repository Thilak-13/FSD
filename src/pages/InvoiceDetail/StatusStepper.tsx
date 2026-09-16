// src/pages/InvoiceDetail/StatusStepper.tsx
import React from 'react';
import { InvoiceStatus } from '../../types';
import { StatusBadge } from '../../components/shared/StatusBadge';

export interface StatusStepperProps {
  status: InvoiceStatus;
  flagReason?: string;
  className?: string;
}

const LIFECYCLE_STEPS: { key: InvoiceStatus; label: string }[] = [
  { key: 'Submitted', label: 'Submitted' },
  { key: 'Under Verification', label: 'Under Verification' },
  { key: 'Approved', label: 'Approved' },
  { key: 'Payment Scheduled', label: 'Payment Scheduled' },
  { key: 'Paid', label: 'Paid' },
];

export const StatusStepper: React.FC<StatusStepperProps> = ({
  status,
  flagReason,
  className,
}) => {
  const isFlagged = status === 'Flagged';

  // Determine active step index
  const getCurrentStepIndex = (): number => {
    switch (status) {
      case 'Submitted':
        return 0;
      case 'Under Verification':
      case 'Flagged':
        return 1;
      case 'Approved':
        return 2;
      case 'Payment Scheduled':
        return 3;
      case 'Paid':
        return 4;
      default:
        return 0;
    }
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <section
      className={`status-stepper-card ${className || ''}`.trim()}
      aria-label="Invoice Lifecycle Progress"
      data-testid="status-stepper"
    >
      <div className="status-stepper-header">
        <h2 className="status-stepper-title">Lifecycle Progress</h2>
        <StatusBadge status={status} size="s" />
      </div>

      {isFlagged && (
        <div
          className="status-stepper-flagged-warning"
          role="alert"
          data-testid="stepper-flagged-warning"
        >
          <StatusBadge status="Flagged" />
          <div>
            <strong>Flagged for Review: </strong>
            <span>{flagReason || 'Discrepancies require manual inspection.'}</span>
          </div>
        </div>
      )}

      <nav aria-label="Invoice lifecycle steps">
        <ol className="status-stepper-list" role="list">
          {LIFECYCLE_STEPS.map((step, idx) => {
            const isCompleted = status === 'Paid' || (!isFlagged && idx < currentStepIndex) || (isFlagged && idx === 0);
            const isCurrent = status !== 'Paid' && (!isFlagged ? idx === currentStepIndex : idx === 1);

            let itemClass = 'status-stepper-item';
            if (isCompleted) itemClass += ' is-completed';
            if (isCurrent) itemClass += ' is-current';
            if (isFlagged && isCurrent) itemClass += ' is-flagged';

            return (
              <li
                key={step.key}
                className={itemClass}
                data-testid={`stepper-step-${step.key.replace(/\s+/g, '-')}`}
                aria-current={isCurrent ? 'step' : undefined}
              >
                <div
                  className="status-stepper-marker"
                  aria-hidden="true"
                  style={
                    isFlagged && isCurrent
                      ? {
                          backgroundColor: 'var(--spectrum-global-color-red-600, #c9252d)',
                          borderColor: 'var(--spectrum-global-color-red-600, #c9252d)',
                          color: 'var(--spectrum-global-color-gray-50, #ffffff)',
                          boxShadow: '0 0 0 4px var(--spectrum-global-color-red-100, #fee2e2)',
                        }
                      : undefined
                  }
                >
                  {isCompleted ? (
                    '✓'
                  ) : isFlagged && isCurrent ? (
                    '!'
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className="status-stepper-label">{step.label}</span>
              </li>
            );
          })}
        </ol>
      </nav>
    </section>
  );
};
