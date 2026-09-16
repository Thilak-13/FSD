// src/pages/Approvals/FlagModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Dialog } from '@swc-react/dialog';
import { Button } from '@swc-react/button';
import { FormField } from '../../components/shared/FormField';
import { Invoice } from '../../types';

export interface FlagModalProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onConfirm: (invoiceId: string, reason: string) => Promise<void> | void;
}

/**
 * Accessible FlagModal wrapping @swc-react/dialog and FormField.
 * Requires a reason before confirming the transition to 'Flagged' status.
 */
export const FlagModal: React.FC<FlagModalProps> = ({
  open,
  invoice,
  onClose,
  onConfirm,
}) => {
  const [reason, setReason] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  // Reset internal state and handle keyboard dismiss
  useEffect(() => {
    if (!open) return;

    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }

    setReason(invoice?.flagReason || '');
    setValidationError(undefined);
    setSubmitting(false);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [open, invoice, onClose]);

  if (!open || !invoice) return null;

  const handleConfirm = async () => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setValidationError('Flag reason is required.');
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(invoice.id, trimmedReason);
      onClose();
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Failed to flag invoice';
      setValidationError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setReason('');
    setValidationError(undefined);
    onClose();
  };

  return (
    <div
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          handleCancel();
        }
      }}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'var(--spectrum-dialog-confirm-overlay-background-color, rgba(0, 0, 0, 0.45))',
        backdropFilter: 'blur(3px)',
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
        aria-labelledby="flag-dialog-heading"
        aria-describedby="flag-dialog-message"
        data-testid="flag-modal-dialog"
        style={{
          maxWidth: '520px',
          width: '100%',
          outline: 'none',
        }}
      >
        <Dialog size="m" dismissable close={handleCancel}>
          <h2
            slot="heading"
            id="flag-dialog-heading"
            style={{
              margin: 0,
              fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
              fontSize: 'var(--spectrum-alias-font-size-heading, 20px)',
              color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
            }}
          >
            Flag Invoice {invoice.invoiceNumber}
          </h2>

          <div
            id="flag-dialog-message"
            style={{
              marginTop: 'var(--spectrum-global-dimension-size-100, 8px)',
              marginBottom: 'var(--spectrum-global-dimension-size-200, 16px)',
              fontFamily: 'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
              fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
              color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
              lineHeight: 1.5,
            }}
          >
            Please specify the discrepancy or issue with this invoice. The requester and finance operations will be notified.
          </div>

          <FormField
            label="Flag Reason"
            htmlFor="flag-reason-input"
            required
            error={validationError}
            hint="Specify reason for discrepancy (e.g., price discrepancy, quantity mismatch)"
          >
            <textarea
              id="flag-reason-input"
              data-testid="flag-reason-input"
              className="flag-reason-textarea"
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (e.target.value.trim()) {
                  setValidationError(undefined);
                }
              }}
              placeholder="e.g., Unit price invoiced exceeds authorized PO rate..."
              required
              aria-required="true"
              aria-invalid={!!validationError}
              autoFocus
            />
          </FormField>

          <Button
            slot="button"
            variant="secondary"
            data-testid="cancel-flag-btn"
            onClick={handleCancel}
          >
            Cancel
          </Button>

          <Button
            slot="button"
            variant="negative"
            data-testid="confirm-flag-btn"
            disabled={!reason.trim() || submitting}
            onClick={handleConfirm}
          >
            {submitting ? 'Flagging...' : 'Flag Invoice'}
          </Button>
        </Dialog>
      </div>
    </div>
  );
};
