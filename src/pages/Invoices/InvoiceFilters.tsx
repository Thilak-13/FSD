// src/pages/Invoices/InvoiceFilters.tsx
import React from 'react';
import { Button } from '@swc-react/button';
import { Vendor, InvoiceStatus } from '../../types';

export interface InvoiceFiltersProps {
  search: string;
  onSearchChange: (val: string) => void;
  status: string;
  onStatusChange: (status: string) => void;
  vendorId: string;
  onVendorChange: (vendorId: string) => void;
  vendors: Vendor[];
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export const INVOICE_STATUSES: InvoiceStatus[] = [
  'Submitted',
  'Under Verification',
  'Approved',
  'Flagged',
  'Payment Scheduled',
  'Paid',
];

export const InvoiceFilters: React.FC<InvoiceFiltersProps> = ({
  search,
  onSearchChange,
  status,
  onStatusChange,
  vendorId,
  onVendorChange,
  vendors,
  onClearFilters,
  hasActiveFilters,
}) => {
  return (
    <section
      className="invoices-filters-card"
      aria-label="Invoice Filters"
      role="search"
    >
      {/* Search Input */}
      <div className="invoice-filter-search">
        <label
          htmlFor="invoice-search-input"
          className="invoice-filter-label"
          style={{ display: 'block', marginBottom: '4px' }}
        >
          Search Invoices
        </label>
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            id="invoice-search-input"
            data-testid="invoice-search-input"
            type="search"
            className="invoice-form-input"
            placeholder="Search by invoice #, vendor, or item..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Search by invoice number, vendor, or item"
          />
        </div>
      </div>

      {/* Status Filter Dropdown */}
      <div className="invoice-filter-select-group">
        <label htmlFor="invoice-status-filter" className="invoice-filter-label">
          Status
        </label>
        <select
          id="invoice-status-filter"
          data-testid="invoice-status-filter"
          className="invoice-filter-select"
          value={status}
          onChange={(e) => onStatusChange(e.target.value)}
          aria-label="Filter by invoice status"
        >
          <option value="all">All Statuses</option>
          {INVOICE_STATUSES.map((st) => (
            <option key={st} value={st}>
              {st}
            </option>
          ))}
        </select>
      </div>

      {/* Vendor Filter Dropdown */}
      <div className="invoice-filter-select-group">
        <label htmlFor="invoice-vendor-filter" className="invoice-filter-label">
          Vendor
        </label>
        <select
          id="invoice-vendor-filter"
          data-testid="invoice-vendor-filter"
          className="invoice-filter-select"
          value={vendorId}
          onChange={(e) => onVendorChange(e.target.value)}
          aria-label="Filter by vendor"
        >
          <option value="all">All Vendors</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
            </option>
          ))}
        </select>
      </div>

      {/* Clear Filters Button */}
      <div className="invoice-clear-filters-btn">
        <Button
          variant="secondary"
          data-testid="clear-filters-button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          aria-label="Clear all applied filters"
        >
          Clear Filters
        </Button>
      </div>
    </section>
  );
};
