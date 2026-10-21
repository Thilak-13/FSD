import React, { useEffect, useRef } from 'react';

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'accent' | 'negative' | 'primary' | 'secondary';
  confirmDisabled?: boolean;
  children?: React.ReactNode;
  className?: string;
}

/**
 * Accessible confirmation modal dialog using standard React & HTML5 elements.
 * Features focus management, Escape key dismiss, and Spectrum token styling.
 */
export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'accent',
  confirmDisabled = false,
  children,
  className,
}) => {
  const confirmBtnRef = useRef<HTMLButtonElement | null>(null);
  const cancelBtnRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Keyboard navigation and focus management
  useEffect(() => {
    if (!open) return;

    // Save previous activeElement to restore focus upon dialog close
    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    // When variant="negative", focus safe Cancel button by default to prevent accidental execution on Enter.
    // Otherwise focus the Confirm button.
    const timer = setTimeout(() => {
      const targetBtn = variant === 'negative' ? cancelBtnRef.current : confirmBtnRef.current;
      if (targetBtn && typeof targetBtn.focus === 'function') {
        targetBtn.focus();
      }
    }, 50);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      clearTimeout(timer);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [open, onCancel, variant]);

  if (!open) return null;

  return (
    <div
      ref={dialogRef}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--spectrum-dialog-confirm-overlay-background-color, rgba(0, 0, 0, 0.4))',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: 'var(--spectrum-global-dimension-size-200, 16px)',
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        aria-labelledby="confirm-dialog-heading"
        aria-describedby="confirm-dialog-message"
        className={className}
        style={{
          maxWidth: '520px',
          width: '100%',
          outline: 'none',
          backgroundColor: '#ffffff',
          borderRadius: '4px',
          padding: '24px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
          boxSizing: 'border-box',
        }}
      >
        <h2
          id="confirm-dialog-heading"
          style={{
            margin: '0 0 12px 0',
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-alias-font-size-heading, 20px)',
            color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
          }}
        >
          {title}
        </h2>

        <div
          id="confirm-dialog-message"
          style={{
            marginTop: 'var(--spectrum-global-dimension-size-100, 8px)',
            marginBottom: '20px',
            fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
            color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
            lineHeight: 1.5,
          }}
        >
          {typeof message === 'string' ? <p style={{ margin: 0 }}>{message}</p> : message}
        </div>

        {children}

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <button
            ref={cancelBtnRef}
            type="button"
            onClick={onCancel}
            style={{
              padding: '7px 16px',
              borderRadius: '16px',
              border: '1px solid #cacaca',
              backgroundColor: '#ffffff',
              color: '#2c2c2c',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {cancelLabel}
          </button>

          <button
            ref={confirmBtnRef}
            type="button"
            onClick={onConfirm}
            disabled={confirmDisabled}
            style={{
              padding: '7px 16px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: variant === 'negative' ? '#d7373f' : '#0265dc',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: confirmDisabled ? 'not-allowed' : 'pointer',
              opacity: confirmDisabled ? 0.6 : 1,
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
