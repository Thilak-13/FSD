// src/pages/Invoices/InvoicesPage.tsx
import React, { useState, useMemo, useContext, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@swc-react/button';
import { ActionButton } from '@swc-react/action-button';
import { Card } from '@swc-react/card';
import { DataTable, Column } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { InvoiceFilters } from './InvoiceFilters';
import { InvoiceFormDialog } from './InvoiceFormDialog';
import { Invoice } from '../../types';
import './invoices.css';

export const InvoicesPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const { currentUser, currentRole } = useAuth();
  const navigate = useNavigate();

  // If DataContext is not provided (e.g. in isolated route-only tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-invoices">Invoices Directory</div>;
  }

  const { invoices, vendors, loading } = dataContext;

  // Local filter states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [vendorFilter, setVendorFilter] = useState<string>('all');

  // Dialog & Toast states
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Vendor Lookup Map
  const vendorMap = useMemo(() => {
    return new Map(vendors.map((v) => [v.id, v.name]));
  }, [vendors]);

  // 1. Role-based filtering:
  // - Requester: see only their own submitted invoices (submittedBy === currentUser.id)
  // - Approver / Admin: see all invoices
  const roleFilteredInvoices = useMemo(() => {
    if (currentRole === 'Requester') {
      const currentUserId = currentUser?.id || 'user-3';
      return invoices.filter((inv) => inv.submittedBy === currentUserId);
    }
    return invoices;
  }, [invoices, currentRole, currentUser?.id]);

  // 2. Query filters (Search, Status, Vendor)
  const filteredInvoices = useMemo(() => {
    return roleFilteredInvoices.filter((inv) => {
      // Status filter
      if (statusFilter !== 'all' && inv.status !== statusFilter) {
        return false;
      }

      // Vendor filter
      if (vendorFilter !== 'all' && inv.vendorId !== vendorFilter) {
        return false;
      }

      // Search filter
      if (searchTerm.trim() !== '') {
        const query = searchTerm.toLowerCase().trim();
        const vendorName = (vendorMap.get(inv.vendorId) || '').toLowerCase();
        const numberMatch = inv.invoiceNumber.toLowerCase().includes(query);
        const vendorMatch = vendorName.includes(query);
        const itemMatch = inv.items?.some((it) =>
          it.description.toLowerCase().includes(query)
        );

        if (!numberMatch && !vendorMatch && !itemMatch) {
          return false;
        }
      }

      return true;
    });
  }, [roleFilteredInvoices, statusFilter, vendorFilter, searchTerm, vendorMap]);

  const hasActiveFilters =
    searchTerm.trim() !== '' || statusFilter !== 'all' || vendorFilter !== 'all';

  const handleClearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('all');
    setVendorFilter('all');
  }, []);

  const handleInvoiceCreated = (newInv: Invoice) => {
    setToastMessage(`Invoice ${newInv.invoiceNumber} was successfully submitted.`);
  };

  // DataTable columns definition
  const columns: Column<Invoice>[] = useMemo(
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
        key: 'vendorId',
        title: 'Vendor Name',
        sortable: true,
        render: (inv) => vendorMap.get(inv.vendorId) || inv.vendorId,
      },
      {
        key: 'amount',
        title: 'Total Amount',
        sortable: true,
        align: 'right',
        render: (inv) =>
          `$${inv.amount.toLocaleString('en-US', {
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
        render: (inv) => <StatusBadge status={inv.status} />,
      },
      {
        key: 'actions',
        title: 'Action',
        align: 'center',
        render: (inv) => (
          <Button
            variant="secondary"
            size="s"
            data-testid={`view-details-${inv.id}`}
            onClick={(e: any) => {
              e.stopPropagation();
              navigate(`/invoices/${inv.id}`);
            }}
            aria-label={`View details for ${inv.invoiceNumber}`}
          >
            View Details
          </Button>
        ),
      },
    ],
    [vendorMap, navigate]
  );

  return (
    <main
      className="invoices-page-container"
      data-testid="page-invoices"
      aria-label="Invoices Management"
    >
      {/* Header */}
      <header className="invoices-header">
        <div className="invoices-header-left">
          <h1 className="invoices-title">Invoices</h1>
          <span
            role="status"
            className="invoices-count-badge"
            data-testid="invoices-count-badge"
            aria-live="polite"
            aria-label={`${filteredInvoices.length} invoices displayed`}
          >
            {filteredInvoices.length} {filteredInvoices.length === 1 ? 'Invoice' : 'Invoices'}
          </span>
        </div>

        <div className="invoices-header-actions">
          <Button
            variant="accent"
            data-testid="new-invoice-trigger"
            onClick={() => setIsDialogOpen(true)}
            aria-label="Submit a new invoice"
          >
            + New Invoice
          </Button>
        </div>
      </header>

      {/* Success Notification Banner / Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="invoices-toast"
          data-testid="invoice-toast-message"
        >
          <div className="invoices-toast-content">
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
          <ActionButton
            quiet
            size="s"
            className="invoices-toast-dismiss"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </ActionButton>
        </div>
      )}

      {/* Filters Bar */}
      <InvoiceFilters
        search={searchTerm}
        onSearchChange={setSearchTerm}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        vendorId={vendorFilter}
        onVendorChange={setVendorFilter}
        vendors={vendors}
        onClearFilters={handleClearFilters}
        hasActiveFilters={hasActiveFilters}
      />

      {/* Invoices DataTable */}
      <Card className="invoices-table-card">
        <DataTable
          columns={columns}
          data={filteredInvoices}
          loading={loading}
          onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
          pagination
          pageSize={10}
          emptyTitle="No Invoices Found"
          emptyMessage={
            hasActiveFilters
              ? 'No invoices matched your current filter criteria. Try clearing filters.'
              : 'There are currently no invoices submitted in the platform.'
          }
          emptyActionLabel={hasActiveFilters ? 'Clear Filters' : undefined}
          onEmptyAction={hasActiveFilters ? handleClearFilters : undefined}
          ariaLabel="Invoices Directory Table"
        />
      </Card>

      {/* Invoice Form Dialog */}
      <InvoiceFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleInvoiceCreated}
      />
    </main>
  );
};
