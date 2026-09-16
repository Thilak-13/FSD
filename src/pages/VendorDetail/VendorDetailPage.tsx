// src/pages/VendorDetail/VendorDetailPage.tsx
import React, { useContext, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@swc-react/button';
import { DataContext } from '../../context/DataContext';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { DataTable, Column } from '../../components/shared/DataTable';
import { EmptyState } from '../../components/shared/EmptyState';
import { LoadingSkeleton } from '../../components/shared/LoadingSkeleton';
import { PurchaseOrder, Invoice } from '../../types';
import '../Vendors/vendors.css';

export const VendorDetailPage: React.FC = () => {
  const dataContext = useContext(DataContext);
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // If DataContext is not provided (e.g. in isolated route-only tests), render fallback
  if (!dataContext) {
    return <div data-testid="page-vendor-detail">Vendor Detail</div>;
  }

  const { vendors, purchaseOrders, invoices, loading } = dataContext;
  const [activeTab, setActiveTab] = useState<'all' | 'pos' | 'invoices'>('all');

  // Find target vendor
  const vendor = useMemo(() => {
    return vendors.find((v) => v.id === id);
  }, [vendors, id]);

  // Filter Active Purchase Orders for this vendor
  const vendorPOs = useMemo(() => {
    if (!vendor) return [];
    return purchaseOrders.filter((po) => po.vendorId === vendor.id);
  }, [purchaseOrders, vendor]);

  // Filter Invoices History for this vendor
  const vendorInvoices = useMemo(() => {
    if (!vendor) return [];
    return invoices.filter((inv) => inv.vendorId === vendor.id);
  }, [invoices, vendor]);

  // PO Table Columns
  const poColumns: Column<PurchaseOrder>[] = useMemo(
    () => [
      {
        key: 'poNumber',
        title: 'PO #',
        sortable: true,
        render: (po) => (
          <span
            style={{
              fontWeight: 600,
              color: 'var(--spectrum-global-color-blue-600, #0d66d0)',
            }}
          >
            {po.poNumber}
          </span>
        ),
      },
      {
        key: 'description',
        title: 'Description',
        render: (po) => po.description,
      },
      {
        key: 'amount',
        title: 'Total Amount',
        sortable: true,
        align: 'right',
        render: (po) =>
          `$${po.amount.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`,
      },
      {
        key: 'createdDate',
        title: 'Created Date',
        sortable: true,
        render: (po) => po.createdDate,
      },
      {
        key: 'status',
        title: 'Status',
        sortable: true,
        render: (po) => <StatusBadge status={po.status || 'Open'} />,
      },
    ],
    []
  );

  // Invoice Table Columns
  const invoiceColumns: Column<Invoice>[] = useMemo(
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
        title: 'Actions',
        align: 'center',
        render: (inv) => (
          <Button
            variant="secondary"
            size="s"
            data-testid={`view-invoice-${inv.id}`}
            onClick={(e: any) => {
              e.stopPropagation();
              navigate(`/invoices/${inv.id}`);
            }}
            aria-label={`View invoice ${inv.invoiceNumber}`}
          >
            View Invoice
          </Button>
        ),
      },
    ],
    [navigate]
  );

  if (loading) {
    return (
      <main
        className="vendor-detail-container"
        data-testid="page-vendor-detail"
        role="main"
        aria-label="Vendor Details"
      >
        <LoadingSkeleton lines={8} ariaLabel="Loading vendor profile..." />
      </main>
    );
  }

  if (!vendor) {
    return (
      <main
        className="vendor-detail-container"
        data-testid="page-vendor-detail"
        role="main"
        aria-label="Vendor Not Found"
      >
        <button
          type="button"
          className="vendor-detail-back-btn"
          data-testid="vendor-back-button"
          onClick={() => navigate('/vendors')}
          aria-label="Back to vendors directory"
        >
          &larr; Back to Vendors
        </button>
        <EmptyState
          title="Vendor Not Found"
          message={`No vendor could be found with ID "${id}".`}
          actionLabel="Return to Directory"
          onAction={() => navigate('/vendors')}
        />
      </main>
    );
  }

  return (
    <main
      className="vendor-detail-container"
      data-testid="page-vendor-detail"
      role="main"
      aria-label={`Vendor Profile: ${vendor.name}`}
    >
      {/* Back Link */}
      <button
        type="button"
        className="vendor-detail-back-btn"
        data-testid="vendor-back-button"
        onClick={() => navigate('/vendors')}
        aria-label="Back to vendors directory"
      >
        &larr; Back to Vendors
      </button>

      {/* Vendor Profile Header Card */}
      <div className="vendor-detail-card" data-testid="vendor-detail-header">
        <div className="vendor-detail-header-main">
          <div className="vendor-detail-name-group">
            <h1 className="vendor-detail-name" data-testid="vendor-name">
              {vendor.name}
            </h1>
            <StatusBadge status={vendor.status} />
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="vendor-detail-meta-grid">
          <div className="vendor-detail-meta-item">
            <span className="vendor-detail-meta-label">Payment Terms</span>
            <span className="vendor-detail-meta-value" data-testid="vendor-payment-terms">
              {vendor.paymentTerms}
            </span>
          </div>

          <div className="vendor-detail-meta-item">
            <span className="vendor-detail-meta-label">Tax ID</span>
            <span className="vendor-detail-meta-value" data-testid="vendor-tax-id">
              {vendor.taxId}
            </span>
          </div>

          <div className="vendor-detail-meta-item">
            <span className="vendor-detail-meta-label">Contact Email</span>
            <span className="vendor-detail-meta-value" data-testid="vendor-email">
              <a
                href={`mailto:${vendor.contactEmail}`}
                style={{
                  color: 'var(--spectrum-global-color-blue-600, #0d66d0)',
                  textDecoration: 'none',
                }}
              >
                {vendor.contactEmail}
              </a>
            </span>
          </div>

          <div className="vendor-detail-meta-item">
            <span className="vendor-detail-meta-label">Phone</span>
            <span className="vendor-detail-meta-value" data-testid="vendor-phone">
              {vendor.phone || '—'}
            </span>
          </div>

          <div className="vendor-detail-meta-item" style={{ gridColumn: '1 / -1' }}>
            <span className="vendor-detail-meta-label">Business Address</span>
            <span className="vendor-detail-meta-value" data-testid="vendor-address">
              {vendor.address}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="vendor-tabs-bar" role="tablist" aria-label="Vendor related records">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'all'}
          className={`vendor-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
          data-testid="tab-all"
          onClick={() => setActiveTab('all')}
        >
          Overview
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'pos'}
          className={`vendor-tab-btn ${activeTab === 'pos' ? 'active' : ''}`}
          data-testid="tab-pos"
          onClick={() => setActiveTab('pos')}
        >
          Purchase Orders
          <span className="vendor-tab-count">{vendorPOs.length}</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'invoices'}
          className={`vendor-tab-btn ${activeTab === 'invoices' ? 'active' : ''}`}
          data-testid="tab-invoices"
          onClick={() => setActiveTab('invoices')}
        >
          Invoices
          <span className="vendor-tab-count">{vendorInvoices.length}</span>
        </button>
      </div>

      {/* Sections Breakdown */}
      <div className="vendor-sections-container">
        {/* Section 1: Active Purchase Orders */}
        {(activeTab === 'all' || activeTab === 'pos') && (
          <section
            className="vendor-section-card"
            data-testid="vendor-pos-section"
            aria-labelledby="heading-active-pos"
          >
            <div className="vendor-section-header">
              <h2 id="heading-active-pos" className="vendor-section-title">
                Active Purchase Orders
              </h2>
              <span className="vendor-tab-count" aria-label={`${vendorPOs.length} purchase orders`}>
                {vendorPOs.length} {vendorPOs.length === 1 ? 'Order' : 'Orders'}
              </span>
            </div>

            <DataTable
              columns={poColumns}
              data={vendorPOs}
              emptyTitle="No Purchase Orders"
              emptyMessage="There are no active purchase orders for this vendor."
              ariaLabel="Active Purchase Orders Table"
            />
          </section>
        )}

        {/* Section 2: Invoices History */}
        {(activeTab === 'all' || activeTab === 'invoices') && (
          <section
            className="vendor-section-card"
            data-testid="vendor-invoices-section"
            aria-labelledby="heading-invoices-history"
          >
            <div className="vendor-section-header">
              <h2 id="heading-invoices-history" className="vendor-section-title">
                Invoices History
              </h2>
              <span className="vendor-tab-count" aria-label={`${vendorInvoices.length} invoices`}>
                {vendorInvoices.length} {vendorInvoices.length === 1 ? 'Invoice' : 'Invoices'}
              </span>
            </div>

            <DataTable
              columns={invoiceColumns}
              data={vendorInvoices}
              onRowClick={(inv) => navigate(`/invoices/${inv.id}`)}
              emptyTitle="No Invoices Found"
              emptyMessage="There is no invoice history for this vendor."
              ariaLabel="Vendor Invoices History Table"
            />
          </section>
        )}
      </div>
    </main>
  );
};
