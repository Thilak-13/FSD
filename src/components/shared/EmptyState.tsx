import React from 'react';

export interface EmptyStateProps {
  title: string;
  message?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryActionLabel?: string;
  onSecondaryAction?: () => void;
  icon?: React.ReactNode;
  className?: string;
}

/**
 * Accessible Empty State component rendered when data sets or query results are empty.
 * Styled purely with CSS/design tokens and compliant with WCAG AA.
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  message,
  description,
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
  icon,
  className,
}) => {
  const displayMessage = message || description;

  return (
    <div
      role="status"
      aria-label={title}
      className={className}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--spectrum-global-dimension-size-500, 40px) var(--spectrum-global-dimension-size-300, 24px)',
        textAlign: 'center',
        backgroundColor: 'var(--spectrum-global-color-gray-50, #ffffff)',
        borderRadius: 'var(--spectrum-alias-border-radius-regular, 4px)',
        border: '1px dashed var(--spectrum-global-color-gray-300, #e1e1e1)',
        margin: 'var(--spectrum-global-dimension-size-200, 16px) 0',
      }}
    >
      {icon && (
        <div
          style={{
            marginBottom: 'var(--spectrum-global-dimension-size-200, 16px)',
            color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
          }}
        >
          {icon}
        </div>
      )}

      <h3
        style={{
          margin: '0 0 var(--spectrum-global-dimension-size-100, 8px) 0',
          fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
          fontSize: 'var(--spectrum-alias-font-size-large, 16px)',
          fontWeight: 600,
          color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
        }}
      >
        {title}
      </h3>

      {displayMessage && (
        <p
          style={{
            margin: '0 0 var(--spectrum-global-dimension-size-300, 24px) 0',
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
            color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
            maxWidth: '480px',
            lineHeight: 1.5,
          }}
        >
          {displayMessage}
        </p>
      )}

      <div
        style={{
          display: 'flex',
          gap: 'var(--spectrum-global-dimension-size-150, 12px)',
          alignItems: 'center',
          flexWrap: 'wrap',
          justifyContent: 'center',
        }}
      >
        {actionLabel && onAction && (
          <button
            type="button"
            className="empty-state-action-btn"
            onClick={onAction}
            style={{
              padding: '8px 16px',
              backgroundColor: 'var(--spectrum-global-color-blue-600, #1473e6)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {actionLabel}
          </button>
        )}

        {secondaryActionLabel && onSecondaryAction && (
          <button
            type="button"
            className="empty-state-secondary-btn"
            onClick={onSecondaryAction}
            style={{
              padding: '8px 16px',
              backgroundColor: 'transparent',
              color: 'var(--spectrum-global-color-gray-800, #464646)',
              border: '1px solid var(--spectrum-global-color-gray-400, #b8b8b8)',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
