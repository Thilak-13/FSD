// src/pages/InvoiceDetail/InvoiceDetailPage.tsx
import React, { useContext, useState, useMemo, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { dataApi } from '../../services/dataSource';
import { AuditEntry } from '../../types';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { EmptyState } from '../../components/shared/EmptyState';
import { StatusStepper } from './StatusStepper';
import { VerificationPanel } from './VerificationPanel';
import { DocumentViewerStub } from './DocumentViewerStub';
import { ApprovalActions } from './ApprovalActions';
import { ActivityFeed } from './ActivityFeed';
import './invoiceDetail.css';

export const InvoiceDetailPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // If DataContext is not provided (e.g. isolated route test), render fallback
  if (!dataContext) {
    return <div data-testid="page-invoice-detail">Invoice Detail</div>;
  }

  const {
    invoices,
    vendors,
    purchaseOrders,
    auditLog,
    loading,
    updateStatus,
    schedulePayment,
    markPaid,
  } = dataContext;

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [invoiceAuditLog, setInvoiceAuditLog] = useState<AuditEntry[]>([]);

  // Find target invoice
  const invoice = useMemo(() => {
    return invoices.find((inv) => inv.id === id);
  }, [invoices, id]);

  const loadInvoiceAuditLog = useCallback(async () => {
    const targetId = invoice?.id || id;
    if (!targetId) return;
    try {
      const entries = await dataApi.getAuditLog(targetId);
      if (entries) {
        setInvoiceAuditLog(entries);
      }
    } catch (err) {
      console.error('Failed to load invoice audit log:', err);
    }
  }, [invoice?.id, id]);

  useEffect(() => {
    loadInvoiceAuditLog();
  }, [loadInvoiceAuditLog]);

  // Combined audit log for invoice
  const displayedAuditLog = useMemo(() => {
    const targetId = invoice?.id || id;
    const map = new Map<string, AuditEntry>();
    (auditLog || []).filter((e) => e.invoiceId === targetId).forEach((e) => map.set(e.id, e));
    invoiceAuditLog.forEach((e) => map.set(e.id, e));
    return Array.from(map.values());
  }, [auditLog, invoiceAuditLog, invoice?.id, id]);

  // Vendor Lookup Map
  const vendorMap = useMemo(() => {
    return new Map(vendors.map((v) => [v.id, v.name]));
  }, [vendors]);

  const vendorName = invoice ? vendorMap.get(invoice.vendorId) || invoice.vendorId : '';

  // Action Handlers
  const handleApprove = useCallback(
    async (comment?: string) => {
      if (!invoice) return;
      await updateStatus(invoice.id, 'Approved', comment);
      await loadInvoiceAuditLog();
      setToastMessage(`Invoice ${invoice.invoiceNumber} was successfully approved.`);
    },
    [invoice, updateStatus, loadInvoiceAuditLog]
  );

  const handleFlag = useCallback(
    async (reason: string) => {
      if (!invoice) return;
      await updateStatus(
        invoice.id,
        'Flagged',
        reason,
        undefined,
        { flagReason: reason }
      );
      await loadInvoiceAuditLog();
      setToastMessage(`Invoice ${invoice.invoiceNumber} has been flagged for review.`);
    },
    [invoice, updateStatus, loadInvoiceAuditLog]
  );

  const handleSchedulePayment = useCallback(
    async (paymentDate: string, comment?: string) => {
      if (!invoice) return;
      await schedulePayment(invoice.id, paymentDate, undefined, comment);
      await loadInvoiceAuditLog();
      setToastMessage(
        `Payment for invoice ${invoice.invoiceNumber} has been scheduled for ${paymentDate}.`
      );
    },
    [invoice, schedulePayment, loadInvoiceAuditLog]
  );

  const handleMarkPaid = useCallback(
    async () => {
      if (!invoice) return;
      await markPaid(invoice.id);
      await loadInvoiceAuditLog();
      setToastMessage(`Invoice ${invoice.invoiceNumber} has been marked as Paid.`);
    },
    [invoice, markPaid, loadInvoiceAuditLog]
  );

  // Loading State
  if (loading && !invoice) {
    return (
      <main
        className="invoice-detail-page"
        data-testid="page-invoice-detail"
        role="main"
        aria-label="Loading invoice details"
      >
        <header className="invoice-detail-header">
          <h1 className="invoice-detail-title" data-testid="invoice-loading-heading">
            Invoice Details
          </h1>
        </header>
        <div className="invoice-detail-loading" data-testid="invoice-detail-loading">
          <LoadingSkeleton lines={8} height={28} />
        </div>
      </main>
    );
  }

  // Not Found State
  if (!invoice) {
    return (
      <main
        className="invoice-detail-page"
        data-testid="page-invoice-detail"
        role="main"
        aria-label="Invoice not found"
      >
        <div className="invoice-detail-not-found" data-testid="invoice-not-found">
          <EmptyState
            title="Invoice Not Found"
            message={`The requested invoice with ID "${id}" could not be found.`}
            actionLabel="Back to Invoices"
            onAction={() => navigate('/invoices')}
          />
        </div>
      </main>
    );
  }

  return (
    <main
      className="invoice-detail-page"
      data-testid="page-invoice-detail"
      role="main"
      aria-label={`Invoice Details: ${invoice.invoiceNumber}`}
    >
      {/* Top Navigation & Back Button */}
      <nav aria-label="Breadcrumb Navigation" className="invoice-detail-header-nav">
        <button
          type="button"
          onClick={() => navigate('/invoices')}
          data-testid="back-to-invoices-btn"
          aria-label="Back to Invoices directory"
          className="invoice-detail-back-btn"
        >
          ← Back to Invoices
        </button>
      </nav>

      {/* Success Notification Banner / Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="invoice-detail-toast"
          data-testid="invoice-detail-toast"
        >
          <div className="invoice-detail-toast-content">
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
            <span>{toastMessage}</span>
          </div>
          <button
            type="button"
            className="invoice-detail-toast-dismiss"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Main Invoice Header */}
      <header className="invoice-detail-header">
        <div className="invoice-detail-header-main">
          <div className="invoice-detail-heading-group">
            <h1 className="invoice-detail-title" data-testid="invoice-heading">
              <span>Invoice Details: </span>
              <span data-testid="invoice-number">{invoice.invoiceNumber}</span>
            </h1>
            <span data-testid="invoice-status-badge">
              <StatusBadge status={invoice.status} size="l" />
            </span>
          </div>
        </div>

        {/* Invoice Metadata Grid */}
        <div className="invoice-detail-meta-grid" data-testid="invoice-meta-grid">
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">Vendor Name</span>
            <span className="invoice-detail-meta-value" data-testid="meta-vendor-name">
              {vendorName}
            </span>
          </div>
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">Total Amount</span>
            <span className="invoice-detail-meta-value invoice-detail-meta-value-amount" data-testid="meta-amount">
              ₹{invoice.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">Due Date</span>
            <span className="invoice-detail-meta-value" data-testid="meta-due-date">
              {invoice.dueDate}
            </span>
          </div>
          <div className="invoice-detail-meta-item">
            <span className="invoice-detail-meta-label">Submitted Date</span>
            <span className="invoice-detail-meta-value" data-testid="meta-submitted-date">
              {invoice.submittedDate}
            </span>
          </div>
          {invoice.scheduledPaymentDate && (
            <div className="invoice-detail-meta-item">
              <span className="invoice-detail-meta-label">Scheduled Payment</span>
              <span className="invoice-detail-meta-value" data-testid="meta-scheduled-date">
                {invoice.scheduledPaymentDate}
              </span>
            </div>
          )}
          {invoice.paidDate && (
            <div className="invoice-detail-meta-item">
              <span className="invoice-detail-meta-label">Paid Date</span>
              <span className="invoice-detail-meta-value" data-testid="meta-paid-date">
                {invoice.paidDate}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* 1. Lifecycle Status Stepper */}
      <StatusStepper status={invoice.status} flagReason={invoice.flagReason} />

      {/* 2. PO Match Verification Panel */}
      <VerificationPanel
        invoice={invoice}
        purchaseOrders={purchaseOrders}
        vendorName={vendorName}
      />

      {/* 3. Document Viewer & Approval Actions (2 Column Grid) */}
      <div className="invoice-detail-two-col">
        <DocumentViewerStub
          invoice={invoice}
          onNotice={(msg) => setToastMessage(msg)}
        />
        <ApprovalActions
          key={invoice.id}
          invoice={invoice}
          onApprove={handleApprove}
          onFlag={handleFlag}
          onSchedulePayment={handleSchedulePayment}
          onMarkPaid={handleMarkPaid}
        />
      </div>

      {/* 4. Audit Activity Feed Timeline */}
      <ActivityFeed invoiceId={invoice.id} auditLog={displayedAuditLog} />
    </main>
  );
};
