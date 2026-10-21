// src/pages/Payments/SchedulePaymentModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FormField } from '../../components/shared/FormField';
import { Invoice } from '../../types';
import { useData } from '../../context/DataContext';

export interface SchedulePaymentModalProps {
  open: boolean;
  invoice: Invoice | null;
  onClose: () => void;
  onConfirm?: (invoiceId: string, paymentDate: string) => Promise<void> | void;
}

/**
 * Accessible SchedulePaymentModal allowing Approver/Admin to pick target disbursement date.
 * Uses standard HTML5 modal dialog and elements.
 */
export const SchedulePaymentModal: React.FC<SchedulePaymentModalProps> = ({
  open,
  invoice,
  onClose,
  onConfirm,
}) => {
  const { schedulePayment } = useData();
  const [paymentDate, setPaymentDate] = useState<string>('');
  const [validationError, setValidationError] = useState<string | undefined>(undefined);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Reset form when dialog opens
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Default to invoice's dueDate or scheduledPaymentDate or today's date
      const initialDate =
        invoice?.scheduledPaymentDate ||
        invoice?.dueDate ||
        new Date().toISOString().split('T')[0];
      setPaymentDate(initialDate);
      setValidationError(undefined);
      setSubmitting(false);
    }
    prevOpenRef.current = open;
  }, [open, invoice?.dueDate, invoice?.scheduledPaymentDate]);

  // Escape key and focus management
  useEffect(() => {
    if (!open) return;

    if (typeof document !== 'undefined') {
      previousActiveElement.current = document.activeElement as HTMLElement | null;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (
        previousActiveElement.current &&
        typeof previousActiveElement.current.focus === 'function'
      ) {
        previousActiveElement.current.focus();
      }
    };
  }, [open]);

  if (!open || !invoice) return null;

  const handleConfirm = async () => {
    if (!paymentDate.trim()) {
      setValidationError('Please select a valid disbursement date.');
      return;
    }

    try {
      setSubmitting(true);
      if (onConfirm) {
        await onConfirm(invoice.id, paymentDate);
      } else {
        await schedulePayment(invoice.id, paymentDate);
      }
      onCloseRef.current();
    } catch (err: unknown) {
      const errMsg =
        err instanceof Error ? err.message : 'Failed to schedule payment';
      setValidationError(errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setValidationError(undefined);
    onCloseRef.current();
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
        backgroundColor:
          'var(--spectrum-dialog-confirm-overlay-background-color, rgba(0, 0, 0, 0.45))',
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
        aria-label="Schedule Payment"
        aria-labelledby="schedule-payment-heading"
        aria-describedby="schedule-payment-desc"
        data-testid="schedule-payment-modal-dialog"
        style={{
          maxWidth: '500px',
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
          id="schedule-payment-heading"
          style={{
            margin: 0,
            fontFamily:
              'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-alias-font-size-heading, 20px)',
            color: 'var(--spectrum-global-color-gray-900, #2c2c2c)',
          }}
        >
          Schedule Payment
        </h2>

        <div
          id="schedule-payment-desc"
          style={{
            marginTop: 'var(--spectrum-global-dimension-size-100, 8px)',
            marginBottom: 'var(--spectrum-global-dimension-size-200, 16px)',
            fontFamily:
              'var(--spectrum-alias-body-text-font-family, "Adobe Clean", sans-serif)',
            fontSize: 'var(--spectrum-alias-font-size-default, 14px)',
            color: 'var(--spectrum-global-color-gray-700, #6e6e6e)',
            lineHeight: 1.5,
          }}
        >
          Select the disbursement execution date for invoice{' '}
          <strong>{invoice.invoiceNumber}</strong> (Amount:{' '}
          <strong>
            ₹
            {invoice.amount.toLocaleString('en-US', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </strong>
          , Due: <strong>{invoice.dueDate}</strong>).
        </div>

        <FormField
          label="Target Disbursement Date"
          htmlFor="schedule-disbursement-date-input"
          required
          error={validationError}
          hint="The authorized date when funds will be released to the vendor"
        >
          <input
            id="schedule-disbursement-date-input"
            data-testid="schedule-disbursement-date-input"
            type="date"
            className="payments-form-input"
            value={paymentDate}
            onChange={(e) => {
              setPaymentDate(e.target.value);
              if (e.target.value) {
                setValidationError(undefined);
              }
            }}
            required
            aria-required="true"
            aria-invalid={!!validationError}
          />
        </FormField>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            marginTop: '20px',
          }}
        >
          <button
            type="button"
            data-testid="cancel-schedule-payment-btn"
            onClick={handleCancel}
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
            Cancel
          </button>

          <button
            type="button"
            data-testid="confirm-schedule-payment-btn"
            disabled={!paymentDate.trim() || submitting}
            onClick={handleConfirm}
            style={{
              padding: '7px 16px',
              borderRadius: '16px',
              border: 'none',
              backgroundColor: '#0265dc',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: (!paymentDate.trim() || submitting) ? 'not-allowed' : 'pointer',
              opacity: (!paymentDate.trim() || submitting) ? 0.6 : 1,
            }}
          >
            {submitting ? 'Scheduling...' : 'Schedule Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};
