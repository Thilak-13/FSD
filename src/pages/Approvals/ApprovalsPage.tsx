// src/pages/Approvals/ApprovalsPage.tsx
import React, { useState, useMemo, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Column } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ConfirmDialog } from '../../components/shared/ConfirmDialog';
import { useAuth } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { ResourceErrorAlert } from '../../components/shared/ResourceErrorAlert';
import { BatchApprovalBar } from './BatchApprovalBar';
import { FlagModal } from './FlagModal';
import { Invoice } from '../../types';
import './approvals.css';

export interface ApprovalsQueueItem extends Invoice {
  vendorName: string;
}

export const ApprovalsPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // If DataContext is not provided (e.g., in isolated route stub tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-approvals">Approvals Triage Queue</div>;
  }

  const { invoices, vendors, loading, updateStatus } = dataContext;

  // Selection state for batch operations
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Dialog & Modal states
  const [approvingInvoice, setApprovingInvoice] = useState<Invoice | null>(null);
  const [flaggingInvoice, setFlaggingInvoice] = useState<Invoice | null>(null);
  const [isBatchConfirmOpen, setIsBatchConfirmOpen] = useState<boolean>(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search filter inside the queue
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Memoized modal & selection dismiss handlers
  const handleCloseFlagModal = useCallback(() => {
    setFlaggingInvoice(null);
  }, []);

  const handleCloseApproveModal = useCallback(() => {
    setApprovingInvoice(null);
  }, []);

  const handleCloseBatchConfirm = useCallback(() => {
    setIsBatchConfirmOpen(false);
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchTerm('');
  }, []);

  // Vendor Lookup Map
  const vendorMap = useMemo(() => {
    return new Map(vendors.map((v) => [v.id, v.name]));
  }, [vendors]);

  // 1. Triage Queue Filtering & Augmentation: display 'Submitted', 'Under Verification', or 'Flagged' invoices
  const queueInvoices = useMemo<ApprovalsQueueItem[]>(() => {
    return invoices
      .filter(
        (inv) =>
          inv.status === 'Submitted' ||
          inv.status === 'Under Verification' ||
          inv.status === 'Flagged'
      )
      .map((inv) => ({
        ...inv,
        vendorName: vendorMap.get(inv.vendorId) || inv.vendorId,
      }));
  }, [invoices, vendorMap]);

  // 2. Metrics calculation
  const metrics = useMemo(() => {
    const totalAwaiting = queueInvoices.length;
    const flaggedCount = queueInvoices.filter((i) => i.status === 'Flagged').length;
    const totalPendingAmount = queueInvoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);

    return {
      totalAwaiting,
      flaggedCount,
      totalPendingAmount,
    };
  }, [queueInvoices]);

  // 3. Page-level search filtered invoices (search by invoice number, vendor name, or flag reason)
  const filteredQueueInvoices = useMemo(() => {
    if (!searchTerm.trim()) return queueInvoices;
    const query = searchTerm.toLowerCase().trim();

    return queueInvoices.filter((inv) => {
      const numMatch = inv.invoiceNumber.toLowerCase().includes(query);
      const vendMatch = inv.vendorName.toLowerCase().includes(query);
      const flagMatch = inv.flagReason?.toLowerCase().includes(query);
      return numMatch || vendMatch || flagMatch;
    });
  }, [queueInvoices, searchTerm]);

  // Action Handlers
  const handleSingleApproveConfirm = async () => {
    if (!approvingInvoice) return;
    try {
      setIsProcessing(true);
      const targetInvoice = approvingInvoice;
      await updateStatus(
        targetInvoice.id,
        'Approved',
        'Approved via Approvals Queue',
        currentUser?.name || currentUser?.id
      );
      // Remove approved invoice from selectedIds if present
      setSelectedIds((prev) => prev.filter((id) => id !== targetInvoice.id));
      setToastMessage(`Invoice ${targetInvoice.invoiceNumber} has been approved.`);
      setApprovingInvoice(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to approve invoice';
      setToastMessage(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchApproveConfirm = async () => {
    if (selectedIds.length === 0) return;
    try {
      setIsProcessing(true);
      const count = selectedIds.length;
      for (const id of selectedIds) {
        await updateStatus(
          id,
          'Approved',
          'Batch approved via Approvals Queue',
          currentUser?.name || currentUser?.id
        );
      }
      setSelectedIds([]);
      setIsBatchConfirmOpen(false);
      setToastMessage(`${count} invoices have been approved.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to batch approve invoices';
      setToastMessage(`Error: ${msg}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFlagConfirm = async (invoiceId: string, reason: string) => {
    const targetInvoice = queueInvoices.find((i) => i.id === invoiceId);
    await updateStatus(
      invoiceId,
      'Flagged',
      reason,
      currentUser?.name || currentUser?.id,
      { flagReason: reason }
    );
    setToastMessage(
      `Invoice ${targetInvoice?.invoiceNumber || invoiceId} has been flagged: ${reason}`
    );
    setFlaggingInvoice(null);
  };

  // DataTable columns definition
  const columns: Column<ApprovalsQueueItem>[] = useMemo(
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
        key: 'submittedDate',
        title: 'Submitted Date',
        sortable: true,
        render: (inv) => inv.submittedDate,
      },
      {
        key: 'dueDate',
        title: 'Due Date',
        sortable: true,
        render: (inv) => inv.dueDate,
      },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        render: (inv) => (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <StatusBadge status={inv.status} />
            {inv.status === 'Flagged' && inv.flagReason && (
              <span
                className="flag-reason-snippet"
                title={inv.flagReason}
                data-testid={`flag-reason-badge-${inv.id}`}
              >
                ⚠️ {inv.flagReason}
              </span>
            )}
          </div>
        ),
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'center',
        render: (inv) => (
          <div className="approval-row-actions">
            <button
              type="button"
              className="approval-row-btn approval-row-btn-accent"
              data-testid={`approve-btn-${inv.id}`}
              onClick={(e: any) => {
                e.stopPropagation();
                setApprovingInvoice(inv);
              }}
              aria-label={`Approve invoice ${inv.invoiceNumber}`}
            >
              Approve
            </button>

            <button
              type="button"
              className="approval-row-btn approval-row-btn-secondary"
              data-testid={`flag-btn-${inv.id}`}
              onClick={(e: any) => {
                e.stopPropagation();
                setFlaggingInvoice(inv);
              }}
              aria-label={`Flag invoice ${inv.invoiceNumber}`}
            >
              Flag
            </button>

            <button
              type="button"
              className="approval-row-btn approval-row-btn-secondary"
              data-testid={`view-btn-${inv.id}`}
              onClick={(e: any) => {
                e.stopPropagation();
                navigate(`/invoices/${inv.id}`);
              }}
              aria-label={`View details for ${inv.invoiceNumber}`}
            >
              View
            </button>
          </div>
        ),
      },
    ],
    [navigate]
  );

  return (
    <main
      className="approvals-page-container"
      data-testid="page-approvals"
      role="main"
      aria-label="Approvals Triage Queue"
    >
      {/* Header */}
      <header className="approvals-header">
        <div className="approvals-header-left">
          <h1 className="approvals-title">Approval Queue</h1>
          <span
            className="approvals-count-badge"
            data-testid="approvals-count-badge"
            aria-live="polite"
            aria-label={`${filteredQueueInvoices.length} invoices in queue`}
          >
            {filteredQueueInvoices.length}{' '}
            {filteredQueueInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>
      </header>

      <ResourceErrorAlert
        message={dataContext.resourceErrors?.invoices}
        onRetry={dataContext.refreshAll}
      />

      {/* Queue Metrics Bar */}
      <section
        className="approvals-metrics-grid"
        aria-label="Queue Summary Metrics"
      >
        <div
          className="approvals-metric-card metric-pending"
          data-testid="metric-awaiting-approval"
        >
          <span className="approvals-metric-label">Total Awaiting Approval</span>
          <span className="approvals-metric-value">{metrics.totalAwaiting}</span>
        </div>

        <div
          className="approvals-metric-card metric-flagged"
          data-testid="metric-flagged-count"
        >
          <span className="approvals-metric-label">Flagged Discrepancies</span>
          <span className="approvals-metric-value">{metrics.flaggedCount}</span>
        </div>

        <div
          className="approvals-metric-card metric-amount"
          data-testid="metric-pending-amount"
        >
          <span className="approvals-metric-label">Total Amount Pending</span>
          <span className="approvals-metric-value">
            ₹{metrics.totalPendingAmount.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </section>

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="approvals-toast"
          data-testid="approvals-toast-message"
        >
          <div className="approvals-toast-content">
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
            className="approvals-toast-dismiss"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Batch Approval Bar (appears when 1 or more invoices checked) */}
      <BatchApprovalBar
        selectedCount={selectedIds.length}
        onApproveSelected={() => setIsBatchConfirmOpen(true)}
        onClearSelection={handleClearSelection}
        loading={isProcessing}
      />

      {/* Search Toolbar (Managed at page level; DataTable searchable is false to avoid double filtering) */}
      <div
        className="approvals-search-toolbar"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 'var(--spectrum-global-dimension-size-150, 12px)',
        }}
      >
        <div className="approvals-search-wrapper">
          <span className="approvals-search-icon" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <input
            type="search"
            data-testid="approvals-search-input"
            className="approvals-search-input"
            placeholder="Search queue by invoice, vendor, or discrepancy..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-label="Search queue by invoice, vendor, or discrepancy..."
          />
        </div>
      </div>

      {/* DataTable (searchable={false} prevents secondary column-filtering bug) */}
      <div className="approvals-table-card">
        <DataTable
          columns={columns}
          data={filteredQueueInvoices}
          loading={loading}
          selectable={true}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          getRowId={(inv) => inv.id}
          searchable={false}
          pagination
          pageSize={50}
          emptyTitle="No Invoices Awaiting Approval"
          emptyMessage={
            searchTerm.trim()
              ? 'No queue invoices matched your search filter.'
              : 'All submitted and flagged invoices have been triaged and approved.'
          }
          emptyActionLabel={searchTerm.trim() ? 'Clear Search' : undefined}
          onEmptyAction={searchTerm.trim() ? handleClearSearch : undefined}
          ariaLabel="Approvals Triage Queue Table"
        />
      </div>

      {/* Inline Approve Confirmation Dialog */}
      <ConfirmDialog
        open={!!approvingInvoice}
        title={`Approve Invoice ${approvingInvoice?.invoiceNumber || ''}`}
        message={
          <div>
            <p style={{ margin: 0 }}>
              Are you sure you want to approve invoice{' '}
              <strong>{approvingInvoice?.invoiceNumber}</strong> for{' '}
              <strong>
                ₹{approvingInvoice?.amount.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
              ?
            </p>
            <p
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
              }}
            >
              This will transition the invoice from {approvingInvoice?.status} to Approved status and queue it for payment disbursement.
            </p>
          </div>
        }
        confirmLabel={isProcessing ? 'Approving...' : 'Approve Invoice'}
        cancelLabel="Cancel"
        variant="accent"
        confirmDisabled={isProcessing}
        onConfirm={handleSingleApproveConfirm}
        onCancel={handleCloseApproveModal}
      />

      {/* Batch Approval Confirmation Dialog */}
      <ConfirmDialog
        open={isBatchConfirmOpen}
        title={`Approve ${selectedIds.length} Selected Invoices`}
        message={
          <div>
            <p style={{ margin: 0 }}>
              Are you sure you want to batch approve all{' '}
              <strong>{selectedIds.length}</strong> selected invoices?
            </p>
            <p
              style={{
                marginTop: '8px',
                fontSize: '12px',
                color: 'var(--spectrum-global-color-gray-600, #8e8e8e)',
              }}
            >
              All selected invoices will be moved to Approved status in the ledger.
            </p>
          </div>
        }
        confirmLabel={isProcessing ? 'Processing...' : 'Confirm Batch Approval'}
        cancelLabel="Cancel"
        variant="accent"
        confirmDisabled={isProcessing}
        onConfirm={handleBatchApproveConfirm}
        onCancel={handleCloseBatchConfirm}
      />

      {/* Flag Discrepancy Modal */}
      <FlagModal
        open={!!flaggingInvoice}
        invoice={flaggingInvoice}
        onClose={handleCloseFlagModal}
        onConfirm={handleFlagConfirm}
      />
    </main>
  );
};
