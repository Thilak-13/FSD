// src/pages/Vendors/VendorsPage.tsx
import React, { useState, useMemo, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, Column } from '../../components/shared/DataTable';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { AuthContext } from '../../context/AuthContext';
import { DataContext } from '../../context/DataContext';
import { ResourceErrorAlert } from '../../components/shared/ResourceErrorAlert';
import { VendorFormDialog } from './VendorFormDialog';
import { Vendor } from '../../types';
import './vendors.css';

export const VendorsPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const auth = useContext(AuthContext);
  const currentRole = auth?.currentRole;
  const navigate = useNavigate();

  // If DataContext is not provided (e.g. in isolated route-only tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-vendors">Vendors Directory</div>;
  }

  const { vendors, loading } = dataContext;

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Filter vendors by search term (vendor name or contact email or taxId)
  const filteredVendors = useMemo(() => {
    if (!searchTerm.trim()) return vendors;
    const term = searchTerm.toLowerCase().trim();
    return vendors.filter((v) => {
      const nameMatch = v.name.toLowerCase().includes(term);
      const emailMatch = v.contactEmail.toLowerCase().includes(term);
      const taxMatch = v.taxId.toLowerCase().includes(term);
      return nameMatch || emailMatch || taxMatch;
    });
  }, [vendors, searchTerm]);

  const handleVendorCreated = (newVendor: Vendor) => {
    setToastMessage(`Vendor "${newVendor.name}" was successfully registered.`);
  };

  const columns: Column<Vendor>[] = useMemo(
    () => [
      {
        key: 'name',
        title: 'Vendor Name',
        sortable: true,
        render: (vendor) => (
          <span
            style={{
              fontWeight: 600,
              color: 'var(--spectrum-global-color-blue-600, #0d66d0)',
            }}
          >
            {vendor.name}
          </span>
        ),
      },
      {
        key: 'paymentTerms',
        title: 'Payment Terms',
        sortable: true,
        render: (vendor) => vendor.paymentTerms,
      },
      {
        key: 'contactEmail',
        title: 'Contact Email',
        sortable: true,
        render: (vendor) => (
          <a
            href={`mailto:${vendor.contactEmail}`}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: 'var(--spectrum-global-color-blue-600, #0d66d0)',
              textDecoration: 'none',
            }}
          >
            {vendor.contactEmail}
          </a>
        ),
      },
      {
        key: 'taxId',
        title: 'Tax ID',
        sortable: true,
        render: (vendor) => vendor.taxId,
      },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        render: (vendor) => <StatusBadge status={vendor.status} />,
      },
      {
        key: 'actions',
        title: 'Actions',
        align: 'center',
        render: (vendor) => (
          <button
            type="button"
            className="vendor-btn-secondary"
            data-testid={`view-details-${vendor.id}`}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/vendors/${vendor.id}`);
            }}
            aria-label={`View details for ${vendor.name}`}
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
            View Details
          </button>
        ),
      },
    ],
    [navigate]
  );

  return (
    <main
      className="vendors-page-container"
      data-testid="page-vendors"
      role="main"
      aria-label="Vendor Directory"
    >
      {/* Header */}
      <header className="vendors-header">
        <div className="vendors-header-left">
          <h1 className="vendors-title">Vendor Directory</h1>
          <span
            className="vendors-count-badge"
            data-testid="vendors-count-badge"
            aria-live="polite"
            aria-label={`${filteredVendors.length} vendors displayed`}
          >
            {filteredVendors.length} {filteredVendors.length === 1 ? 'Vendor' : 'Vendors'}
          </span>
        </div>

        <div className="vendors-header-actions">
          {currentRole === 'Admin' && (
            <button
              type="button"
              className="vendor-btn-accent"
              data-testid="add-vendor-trigger"
              onClick={() => setIsDialogOpen(true)}
              aria-label="Add a new vendor"
              style={{
                padding: '7px 16px',
                borderRadius: '16px',
                border: 'none',
                backgroundColor: '#0265dc',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              + Add Vendor
            </button>
          )}
        </div>
      </header>

      <ResourceErrorAlert
        message={dataContext.resourceErrors?.vendors}
        onRetry={dataContext.refreshAll}
      />

      {/* Success Notification Banner / Toast */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          className="vendors-toast"
          data-testid="vendor-toast-message"
        >
          <div className="vendors-toast-content">
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
            className="vendors-toast-dismiss"
            onClick={() => setToastMessage(null)}
            aria-label="Dismiss notification"
          >
            &times;
          </button>
        </div>
      )}

      {/* Search Toolbar */}
      <div className="vendors-search-card">
        <input
          type="search"
          data-testid="vendor-search-input"
          className="vendor-search-input"
          placeholder="Search by vendor name, email, or tax ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          aria-label="Search vendors"
        />
        {searchTerm && (
          <button
            type="button"
            className="vendor-btn-secondary"
            data-testid="clear-search-button"
            onClick={() => setSearchTerm('')}
            aria-label="Clear search"
            style={{
              padding: '6px 14px',
              borderRadius: '14px',
              border: '1px solid #cacaca',
              backgroundColor: '#ffffff',
              color: '#2c2c2c',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Vendors DataTable */}
      <div className="vendors-table-card">
        <DataTable
          columns={columns}
          data={filteredVendors}
          loading={loading}
          onRowClick={(vendor) => navigate(`/vendors/${vendor.id}`)}
          pagination
          pageSize={10}
          emptyTitle="No Vendors Found"
          emptyMessage={
            searchTerm
              ? 'No vendors matched your search criteria. Try a different query or clear search.'
              : 'There are currently no vendors registered in the directory.'
          }
          emptyActionLabel={searchTerm ? 'Clear Search' : undefined}
          onEmptyAction={searchTerm ? () => setSearchTerm('') : undefined}
          ariaLabel="Vendors Directory Table"
        />
      </div>

      {/* Add Vendor Form Dialog */}
      <VendorFormDialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onSuccess={handleVendorCreated}
      />
    </main>
  );
};
