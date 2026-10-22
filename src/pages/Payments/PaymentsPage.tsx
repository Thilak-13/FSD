// src/pages/Payments/PaymentsPage.tsx
import React, { useState, useMemo, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Column } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { FormField } from '../../components/shared/FormField';
import { DataContext } from '../../context/DataContext';
import { ResourceErrorAlert } from '../../components/shared/ResourceErrorAlert';
import { PaymentSummaryStrip } from './PaymentSummaryStrip';
import { SchedulePaymentModal } from './SchedulePaymentModal';
import { Invoice } from '../../types';
import './payments.css';

export interface PaymentTableItem extends Invoice {
  vendorName: string;
}

export const PaymentsPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const navigate = useNavigate();

  // If DataContext is not provided (e.g., in isolated route stub tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-payments">Payments Disbursement</div>;
  }

  const { invoices, vendors, loading, markPaid, schedulePayment } = dataContext;

  // Dialog & Modal states
  const [schedulingInvoice, setSchedulingInvoice] = useState<PaymentTableItem | null>(null);
  const [payingInvoice, setPayingInvoice] = useState<PaymentTableItem | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Filters state
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Vendor Lookup Map
  const vendorMap = useMemo(() => {
    return new Map(vendors.map((v) => [v.id, v.name]));
  }, [vendors]);

  // Today reference date string for overdue check
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // 1. Filter ledger to only invoices eligible for payments view: Approved, Payment Scheduled, or Paid
  const eligibleInvoices = useMemo<PaymentTableItem[]>(() => {
    return invoices
      .filter(
        (inv) =>
          inv.status === 'Approved' ||
          inv.status === 'Payment Scheduled' ||
          inv.status === 'Paid'
      )
      .map((inv) => ({
        ...inv,
        vendorName: vendorMap.get(inv.vendorId) || inv.vendorId,
      }));
  }, [invoices, vendorMap]);

  // 2. Filter by status and search query
  const filteredInvoices = useMemo(() => {
    return eligibleInvoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }

      // Search term filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const numberMatch = inv.invoiceNumber.toLowerCase().includes(query);
        const vendorMatch = inv.vendorName.toLowerCase().includes(query);
        if (!numberMatch && !vendorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [eligibleInvoices, statusFilter, searchTerm]);

  const hasActiveFilters = statusFilter !== 'all' || searchTerm.trim() !== '';

  const handleClearFilters = useCallback(() => {
    setStatusFilter('all');
    setSearchTerm('');
  }, []);

  // Action Handlers
  const handleScheduleConfirm = async (invoiceId: string, targetDate: string) => {
    try {
      setIsProcessing(true);
      await schedulePayment(invoiceId, targetDate);
      const target = eligibleInvoices.find((i) => i.id === invoiceId);
      setToastMessage(
        `Payment scheduled for ${target?.invoiceNumber || invoiceId} on ${targetDate}.`
      );
      setSchedulingInvoice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to schedule payment';
      setToastMessage(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkPaidConfirm = async () => {
    if (!payingInvoice) return;
    try {
      setIsProcessing(true);
      const targetInvoice = payingInvoice;
      await markPaid(targetInvoice.id);
      setToastMessage(`Invoice ${targetInvoice.invoiceNumber} marked as Paid.`);
      setPayingInvoice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to mark payment as paid';
      setToastMessage(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // DataTable columns definition
  const columns: Column<PaymentTableItem>[] = useMemo(
    () => [
      {
        key: 'invoiceNumber',
        title: 'Invoice #',
        sortable: true,
        render: (inv) => (
          <span
            style={{
              fontWeight: 600,
              color: 'var(--spectrum-global-color-blue-600, #0d66d0)',
            }}
          >
            {inv.invoiceNumber}
          </span>
        ),
      },
      {
        key: 'vendorName',
        title: 'Vendor Name',
        sortable: true,
        render: (inv) => inv.vendorName,
      },
      {
        key: 'amount',
        title: 'Amount',
        sortable: true,
        align: 'right',
        render: (inv) =>
          `₹${inv.amount.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        key: 'dueDate',
        title: 'Due Date',
        sortable: true,
        render: (inv) => {
          const isOverdue =
            (inv.status === 'Approved' || inv.status === 'Payment Scheduled') &&
            Boolean(inv.dueDate && inv.dueDate < todayStr);

          return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>{inv.dueDate}</span>
              {isOverdue && (
                <span
                  className="payments-overdue-pill"
                  title="Payment past due date"
                  aria-label="Past due"
                >
                  Overdue
                </span>
              )}
            </div>
          );
        },
      },
      {
        key: 'scheduledOrPaidDate',
        title: 'Scheduled / Paid Date',
        sortable: true,
        render: (inv) => {
          if (inv.status === 'Paid') {
            return inv.paidDate || inv.scheduledPaymentDate || '—';
          }
          if (inv.status === 'Payment Scheduled') {
            return inv.scheduledPaymentDate || '—';
          }
          return '—';
        },
      },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        render: (inv) => <StatusBadge status={inv.status} />,
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'right',
        render: (inv) => (
          <div className="payments-row-actions">
            {inv.status === 'Approved' && (
              <button
                type="button"
                className="payments-btn-accent"
                data-testid={`action-schedule-${inv.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setSchedulingInvoice(inv);
                }}
                aria-label={`Schedule payment for ${inv.invoiceNumber}`}
                style={{
                  padding: '5px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#0265dc',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Schedule Payment
              </button>
            )}

            {inv.status === 'Payment Scheduled' && (
              <button
                type="button"
                className="payments-btn-accent"
                data-testid={`action-mark-paid-${inv.id}`}
                onClick={(e) => {
                  e.stopPropagation();
                  setPayingInvoice(inv);
                }}
                aria-label={`Mark invoice ${inv.invoiceNumber} as paid`}
                style={{
                  padding: '5px 12px',
                  borderRadius: '14px',
                  border: 'none',
                  backgroundColor: '#0265dc',
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Mark as Paid
              </button>
            )}

            <button
              type="button"
              className="payments-btn-secondary"
              data-testid={`action-view-${inv.id}`}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/invoices/${inv.id}`);
              }}
              aria-label={`View details for ${inv.invoiceNumber}`}
              style={{
                padding: '5px 12px',
                borderRadius: '14px',
                border: '1px solid #cacaca',
                backgroundColor: '#ffffff',
                color: '#2c2c2c',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              View
            </button>
          </div>
        ),
      },
    ],
    [navigate, todayStr]
  );

  return (
    <main
      className="payments-page-container"
      data-testid="page-payments"
      role="main"
      aria-label="Vendor Payments Dashboard"
    >
      {/* Header */}
      <header className="payments-header">
        <div className="payments-header-title-group">
          <div className="payments-header-title-row">
            <h1 className="payments-title">Vendor Payments</h1>
            <span
              className="payments-count-badge"
              data-testid="payments-count-badge"
              aria-live="polite"
              aria-label={`${filteredInvoices.length} payments`}
            >
              {filteredInvoices.length}{' '}
              {filteredInvoices.length === 1 ? 'Record' : 'Records'}
            </span>
          </div>
          <p className="payments-description">
            Track disbursement schedules, manage releases, and review settled vendor disbursements.
          </p>
        </div>
      </header>

      <ResourceErrorAlert
        message={dataContext.resourceErrors?.invoices}
        onRetry={dataContext.refreshAll}
      />

      {/* Summary Strip */}
      <PaymentSummaryStrip invoices={invoices} />

      {/* Toast Feedback Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="payments-toast"
          data-testid="payments-toast-message"
        >
          <div className="payments-toast-content">
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
            className="payments-toast-dismiss"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <section
        className="payments-filter-toolbar"
        aria-label="Payment Filters"
        role="search"
      >
        <div className="payments-filter-controls">
          {/* Search Input */}
          <FormField
            label="Search Payments"
            htmlFor="payments-search-input"
            className="payments-filter-search"
          >
            <input
              id="payments-search-input"
              data-testid="payments-search-input"
              type="search"
              className="payments-form-input"
              placeholder="Search by invoice # or vendor name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search by invoice number or vendor name"
            />
          </FormField>

          {/* Status Filter */}
          <FormField
            label="Payment Status"
            htmlFor="payments-status-filter"
            className="payments-filter-select-group"
          >
            <select
              id="payments-status-filter"
              data-testid="payments-status-filter"
              className="payments-filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              aria-label="Filter by payment status"
            >
              <option value="all">All Payments</option>
              <option value="Approved">Approved (Awaiting Scheduling)</option>
              <option value="Payment Scheduled">Payment Scheduled</option>
              <option value="Paid">Paid</option>
            </select>
          </FormField>

          {/* Clear Filters Button */}
          {hasActiveFilters && (
            <div style={{ marginBottom: 'var(--spectrum-global-dimension-size-200, 16px)' }}>
              <button
                type="button"
                className="payments-btn-secondary"
                data-testid="clear-payments-filters-btn"
                onClick={handleClearFilters}
                aria-label="Clear payment filters"
                style={{
                  padding: '7px 16px',
                  borderRadius: '16px',
                  border: '1px solid #cacaca',
                  backgroundColor: '#ffffff',
                  color: '#2c2c2c',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  height: '32px',
                  boxSizing: 'border-box',
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* DataTable */}
      <div className="payments-table-card">
        <DataTable
          columns={columns}
          data={filteredInvoices}
          loading={loading}
          getRowId={(inv) => inv.id}
          searchable={false}
          pagination
          pageSize={10}
          emptyTitle="No Payments Found"
          emptyMessage={
            hasActiveFilters
              ? 'No payments matched your current search or status filter.'
              : 'No approved, scheduled, or paid invoices found in the system.'
          }
          emptyActionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onEmptyAction={hasActiveFilters ? handleClearFilters : undefined}
          ariaLabel="Vendor Payments Table"
        />
      </div>

      {/* Schedule Payment Modal */}
      <SchedulePaymentModal
        open={!!schedulingInvoice}
        invoice={schedulingInvoice}
        onClose={() => setSchedulingInvoice(null)}
        onConfirm={handleScheduleConfirm}
      />

      {/* Confirm Disbursement Dialog ("Mark as Paid") */}
      <ConfirmDialog
        open={!!payingInvoice}
        title={`Confirm Disbursement for ${payingInvoice?.invoiceNumber || ''}`}
        message={
          <div>
            <p style={{ margin: 0 }}>
              Are you sure you want to mark invoice{' '}
              <strong>{payingInvoice?.invoiceNumber}</strong> (Vendor:{' '}
              <strong>{payingInvoice?.vendorName}</strong>) for{' '}
              <strong>
                ₹
                {payingInvoice?.amount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>{' '}
              as <strong>Paid</strong>?
            </p>
            <p
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
              }}
            >
              This action records the disbursement settlement in the audit log and moves the invoice into Paid status.
            </p>
          </div>
        }
        confirmLabel={isProcessing ? 'Processing...' : 'Mark as Paid'}
        cancelLabel="Cancel"
        variant="accent"
        confirmDisabled={isProcessing}
        onConfirm={handleMarkPaidConfirm}
        onCancel={() => setPayingInvoice(null)}
      />
    </main>
  );
};
