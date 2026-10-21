import React from 'react';
import { FormField } from '../../components/shared/FormField';
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
    <div
      className="invoices-filters-card"
      aria-label="Invoice Filters"
      role="search"
    >
      {/* Search Input */}
      <FormField
        label="Search Invoices"
        htmlFor="invoice-search-input"
        className="invoice-filter-search"
      >
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
      </FormField>

      {/* Status Filter Dropdown */}
      <FormField
        label="Status"
        htmlFor="invoice-status-filter"
        className="invoice-filter-select-group"
      >
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
      </FormField>

      {/* Vendor Filter Dropdown */}
      <FormField
        label="Vendor"
        htmlFor="invoice-vendor-filter"
        className="invoice-filter-select-group"
      >
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
      </FormField>

      {/* Clear Filters Button */}
      <div className="invoice-clear-filters-btn">
        <button
          type="button"
          data-testid="clear-filters-button"
          onClick={onClearFilters}
          disabled={!hasActiveFilters}
          aria-label="Clear all applied filters"
          style={{
            padding: '8px 16px',
            fontSize: '14px',
            fontWeight: 500,
            fontFamily: 'inherit',
            borderRadius: '4px',
            border: '1px solid var(--spectrum-global-color-gray-300, #e1e1e1)',
            backgroundColor: !hasActiveFilters ? 'var(--spectrum-global-color-gray-100, #f4f4f4)' : 'var(--spectrum-global-color-gray-50, #ffffff)',
            color: !hasActiveFilters ? 'var(--spectrum-global-color-gray-400, #a0a0a0)' : 'var(--spectrum-global-color-gray-800, #4b4b4b)',
            cursor: !hasActiveFilters ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease',
          }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};
