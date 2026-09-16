// src/pages/InvoiceDetail/ActivityFeed.tsx
import React, { useMemo } from 'react';
import { AuditEntry, StatusLightVariant } from '../../types';
import { StatusBadge } from '../../components/shared/StatusBadge';

export interface ActivityFeedProps {
  invoiceId: string;
  auditLog: AuditEntry[];
  className?: string;
}

const getActionVariant = (action: string): StatusLightVariant => {
  const norm = action.toUpperCase();
  switch (norm) {
    case 'APPROVAL':
    case 'PAYMENT_COMPLETED':
      return 'positive';
    case 'FLAGGED':
      return 'negative';
    case 'VERIFICATION':
    case 'PAYMENT_SCHEDULED':
      return 'notice';
    case 'SUBMISSION':
    default:
      return 'info';
  }
};

const formatActionName = (action: string): string => {
  return action
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const formatDate = (isoString: string): string => {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
};

export const ActivityFeed: React.FC<ActivityFeedProps> = ({
  invoiceId,
  auditLog,
  className,
}) => {
  const invoiceAudits = useMemo(() => {
    return auditLog
      .filter((entry) => entry.invoiceId === invoiceId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [auditLog, invoiceId]);

  return (
    <section
      className={`activity-feed-card ${className || ''}`.trim()}
      aria-label="Activity and Audit Trail"
      data-testid="activity-feed"
    >
      <div className="activity-feed-header">
        <h2 className="activity-feed-heading">Activity & Audit Trail</h2>
        <span
          style={{
            fontSize: 'var(--spectrum-global-dimension-size-150, 12px)',
            color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
            fontWeight: 600,
          }}
          data-testid="activity-count"
        >
          {invoiceAudits.length} {invoiceAudits.length === 1 ? 'Event' : 'Events'}
        </span>
      </div>

      {invoiceAudits.length === 0 ? (
        <div
          style={{
            padding: 'var(--spectrum-global-dimension-size-200, 16px)',
            textAlign: 'center',
            color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
          }}
          data-testid="empty-activity-message"
        >
          No activity recorded for this invoice yet.
        </div>
      ) : (
        <ol className="activity-feed-list" role="list">
          {invoiceAudits.map((entry) => (
            <li
              key={entry.id}
              className="activity-feed-item"
              data-testid={`activity-entry-${entry.id}`}
            >
              <div className="activity-feed-content">
                <div className="activity-feed-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <StatusBadge
                      variant={getActionVariant(entry.action)}
                      label={formatActionName(entry.action)}
                      size="s"
                    />
                    <span className="activity-feed-user" data-testid="activity-user">
                      {entry.performedBy}
                    </span>
                  </div>
                  <time
                    dateTime={entry.timestamp}
                    className="activity-feed-time"
                    data-testid="activity-timestamp"
                  >
                    {formatDate(entry.timestamp)}
                  </time>
                </div>

                {entry.details && (
                  <div className="activity-feed-details" data-testid="activity-details">
                    {entry.details}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
