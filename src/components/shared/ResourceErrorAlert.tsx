// src/components/shared/ResourceErrorAlert.tsx
import React, { useState } from 'react';

export interface ResourceErrorAlertProps {
  /** Error for this page's resource (from DataContext.resourceErrors); nothing renders when empty. */
  message?: string | null;
  onRetry: () => Promise<void> | void;
}

export const ResourceErrorAlert: React.FC<ResourceErrorAlertProps> = ({ message, onRetry }) => {
  const [retrying, setRetrying] = useState(false);

  if (!message) return null;

  const handleRetry = async () => {
    setRetrying(true);
    try {
      await onRetry();
    } catch {
      // A failed retry surfaces through the context error state, which re-renders this banner.
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div
      role="alert"
      data-testid="resource-error-alert"
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '12px',
        margin: '0 0 16px',
        padding: '10px 14px',
        backgroundColor: 'var(--spectrum-global-color-red-100, #fee2e2)',
        border: '1px solid var(--spectrum-global-color-red-400, #f87171)',
        borderRadius: '4px',
        color: 'var(--spectrum-global-color-red-700, #b91c1c)',
        fontSize: '13px',
      }}
    >
      <span>{message}</span>
      <button
        type="button"
        data-testid="resource-error-retry"
        onClick={handleRetry}
        disabled={retrying}
        style={{
          padding: '4px 12px',
          fontSize: '12px',
          fontWeight: 600,
          fontFamily: 'inherit',
          borderRadius: '4px',
          border: '1px solid currentColor',
          backgroundColor: 'transparent',
          color: 'inherit',
          cursor: retrying ? 'not-allowed' : 'pointer',
        }}
      >
        {retrying ? 'Retrying…' : 'Retry'}
      </button>
    </div>
  );
};
