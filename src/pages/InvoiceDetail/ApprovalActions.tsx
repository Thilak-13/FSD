// src/pages/InvoiceDetail/ApprovalActions.tsx
import React, { useState } from 'react';
import { Invoice } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormField } from '../../components/shared/FormField';

export interface ApprovalActionsProps {
  invoice: Invoice;
  onApprove: (comment?: string) => Promise<void>;
  onFlag: (reason: string) => Promise<void>;
  onSchedulePayment: (paymentDate: string, comment?: string) => Promise<void>;
  onMarkPaid?: () => Promise<void>;
  className?: string;
}

export const ApprovalActions: React.FC<ApprovalActionsProps> = ({
  invoice,
  onApprove,
  onFlag,
  onSchedulePayment,
  onMarkPaid,
  className,
}) => {
  const { currentRole } = useAuth();

  // Dialog open states
  const [isApproveOpen, setIsApproveOpen] = useState<boolean>(false);
  const [isFlagOpen, setIsFlagOpen] = useState<boolean>(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState<boolean>(false);
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState<boolean>(false);

  // Form input states
  const [flagReason, setFlagReason] = useState<string>('');
  const [flagError, setFlagError] = useState<string | undefined>(undefined);
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    return invoice.dueDate || new Date().toISOString().split('T')[0];
  });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Gating: only Approver and Admin can take action
  const canAct = currentRole === 'Approver' || currentRole === 'Admin';

  if (!canAct) {
    return (
      <section
        className={`approval-actions-card ${className || ''}`.trim()}
        aria-label="Approval Actions"
        data-testid="approval-actions"
      >
        <h2 className="approval-actions-heading">Approval & Workflow Actions</h2>
        <div
          className="approval-actions-readonly-notice"
          role="status"
          data-testid="readonly-notice"
        >
          <strong>Read-Only View:</strong> You have read-only access to this invoice as a Requester.
          Approval, review flagging, and payment scheduling require an Approver or Admin role.
        </div>
      </section>
    );
  }

  const isPaid = invoice.status === 'Paid';
  const isApproved = invoice.status === 'Approved';
  const isPaymentScheduled = invoice.status === 'Payment Scheduled';
  const canApprove =
    invoice.status === 'Submitted' ||
    invoice.status === 'Under Verification' ||
    invoice.status === 'Flagged';

  const handleApproveConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onApprove('Invoice approved following PO match verification');
      setIsApproveOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFlagConfirm = async () => {
    if (!flagReason.trim()) {
      setFlagError('Please provide a reason for flagging this invoice');
      return;
    }
    setFlagError(undefined);
    setIsSubmitting(true);
    try {
      await onFlag(flagReason.trim());
      setIsFlagOpen(false);
      setFlagReason('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScheduleConfirm = async () => {
    if (!paymentDate) return;
    setIsSubmitting(true);
    try {
      await onSchedulePayment(paymentDate);
      setIsScheduleOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkPaidConfirm = async () => {
    if (!onMarkPaid) return;
    setIsSubmitting(true);
    try {
      await onMarkPaid();
      setIsMarkPaidOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section
      className={`approval-actions-card ${className || ''}`.trim()}
      aria-label="Approval Actions"
      data-testid="approval-actions"
    >
      <h2 className="approval-actions-heading">Approval & Workflow Actions</h2>

      {isPaid ? (
        <div
          className="approval-actions-readonly-notice"
          role="status"
          data-testid="paid-notice"
        >
          <strong>Payment Completed:</strong> This invoice has already been settled and marked as Paid on{' '}
          {invoice.paidDate || 'record'}. No further approval actions are required.
        </div>
      ) : (
        <div className="approval-actions-bar">
          <div className="approval-actions-buttons">
            {/* Approve Button */}
            {canApprove && !isApproved && !isPaymentScheduled && (
              <button
                type="button"
                className="approval-action-btn approval-action-btn-accent"
                onClick={() => setIsApproveOpen(true)}
                disabled={isSubmitting}
                data-testid="approve-invoice-btn"
                aria-label={`Approve invoice ${invoice.invoiceNumber}`}
              >
                Approve Invoice
              </button>
            )}

            {/* Flag for Review Button */}
            <button
              type="button"
              className="approval-action-btn approval-action-btn-negative"
              onClick={() => {
                setFlagReason(invoice.flagReason || '');
                setIsFlagOpen(true);
              }}
              disabled={isSubmitting}
              data-testid="flag-invoice-btn"
              aria-label={`Flag invoice ${invoice.invoiceNumber} for review`}
            >
              Flag for Review
            </button>

            {/* Schedule Payment Button */}
            <button
              type="button"
              className="approval-action-btn approval-action-btn-primary"
              onClick={() => setIsScheduleOpen(true)}
              disabled={isSubmitting}
              data-testid="schedule-payment-btn"
              aria-label={`Schedule payment for invoice ${invoice.invoiceNumber}`}
            >
              Schedule Payment
            </button>

            {/* Mark as Paid (if already scheduled or admin) */}
            {(isPaymentScheduled || currentRole === 'Admin') && onMarkPaid && (
              <button
                type="button"
                className="approval-action-btn approval-action-btn-secondary"
                onClick={() => setIsMarkPaidOpen(true)}
                disabled={isSubmitting}
                data-testid="mark-paid-btn"
                aria-label={`Mark invoice ${invoice.invoiceNumber} as paid`}
              >
                Mark as Paid
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Dialog: Approve */}
      <ConfirmDialog
        open={isApproveOpen}
        title="Approve Invoice"
        message={`Are you sure you want to approve invoice ${invoice.invoiceNumber} for ₹${invoice.amount.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2 }
        )}? This confirms line items and verification compliance.`}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        variant="accent"
        confirmDisabled={isSubmitting}
        onConfirm={handleApproveConfirm}
        onCancel={() => setIsApproveOpen(false)}
      />

      {/* Confirmation Dialog: Flag for Review */}
      <ConfirmDialog
        open={isFlagOpen}
        title="Flag Invoice for Review"
        message="Please provide a reason for flagging this invoice. The invoice status will be changed to Flagged and the submitter alerted."
        confirmLabel="Flag Invoice"
        cancelLabel="Cancel"
        variant="negative"
        confirmDisabled={!flagReason.trim() || isSubmitting}
        onConfirm={handleFlagConfirm}
        onCancel={() => setIsFlagOpen(false)}
      >
        <div style={{ marginTop: '12px' }}>
          <FormField
            label="Flag Reason"
            htmlFor="flag-reason-textarea"
            required
            error={flagError}
          >
            <textarea
              id="flag-reason-textarea"
              data-testid="flag-reason-input"
              rows={3}
              value={flagReason}
              onChange={(e) => {
                setFlagReason(e.target.value);
                if (e.target.value.trim()) setFlagError(undefined);
              }}
              className="invoice-form-input"
              placeholder="e.g. Unit price variance on line 1 exceeds authorized PO rate"
              aria-required="true"
            />
          </FormField>
        </div>
      </ConfirmDialog>

      {/* Confirmation Dialog: Schedule Payment */}
      <ConfirmDialog
        open={isScheduleOpen}
        title="Schedule Payment Disbursement"
        message={`Select disbursement date for invoice ${invoice.invoiceNumber} (₹${invoice.amount.toLocaleString(
          'en-US',
          { minimumFractionDigits: 2 }
        )}).`}
        confirmLabel="Schedule Payment"
        cancelLabel="Cancel"
        variant="accent"
        confirmDisabled={!paymentDate || isSubmitting}
        onConfirm={handleScheduleConfirm}
        onCancel={() => setIsScheduleOpen(false)}
      >
        <div style={{ marginTop: '12px' }}>
          <FormField
            label="Disbursement Date"
            htmlFor="schedule-payment-date-input"
            required
          >
            <input
              type="date"
              id="schedule-payment-date-input"
              data-testid="payment-date-input"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className="invoice-form-input"
              aria-required="true"
            />
          </FormField>
        </div>
      </ConfirmDialog>

      {/* Confirmation Dialog: Mark Paid */}
      <ConfirmDialog
        open={isMarkPaidOpen}
        title="Confirm Payment Settlement"
        message={`Mark invoice ${invoice.invoiceNumber} as fully paid and settled?`}
        confirmLabel="Confirm Settlement"
        cancelLabel="Cancel"
        variant="accent"
        confirmDisabled={isSubmitting}
        onConfirm={handleMarkPaidConfirm}
        onCancel={() => setIsMarkPaidOpen(false)}
      />
    </section>
  );
};
