import React from 'react';
import { Button } from '@swc-react/button';
import { Card } from '@swc-react/card';
import { Picker } from '@swc-react/picker';
import { MenuItem } from '@swc-react/menu';
import '@spectrum-web-components/menu/sp-menu-item.js';
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
    <Card
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
        <Picker
          id="invoice-status-filter"
          data-testid="invoice-status-filter"
          className="invoice-filter-select"
          value={status}
          change={(e: any) => onStatusChange(e.target?.value !== undefined ? e.target.value : (e.target as any)?.value)}
          ref={(node: any) => {
            if (node && !node.__hasChangeListener) {
              node.__hasChangeListener = true;
              node.addEventListener('change', (e: any) => {
                const val = e.target?.value !== undefined ? e.target.value : (node.value || '');
                onStatusChange(val);
              });
            }
          }}
          aria-label="Filter by invoice status"
          label="Status"
        >
          <MenuItem value="all">All Statuses</MenuItem>
          {INVOICE_STATUSES.map((st) => (
            <MenuItem key={st} value={st}>
              {st}
            </MenuItem>
          ))}
        </Picker>
      </FormField>

      {/* Vendor Filter Dropdown */}
      <FormField
        label="Vendor"
        htmlFor="invoice-vendor-filter"
        className="invoice-filter-select-group"
      >
        <Picker
          id="invoice-vendor-filter"
          data-testid="invoice-vendor-filter"
          className="invoice-filter-select"
          value={vendorId}
          change={(e: any) => onVendorChange(e.target?.value !== undefined ? e.target.value : (e.target as any)?.value)}
          ref={(node: any) => {
            if (node && !node.__hasChangeListener) {
              node.__hasChangeListener = true;
              node.addEventListener('change', (e: any) => {
                const val = e.target?.value !== undefined ? e.target.value : (node.value || '');
                onVendorChange(val);
              });
            }
          }}
          aria-label="Filter by vendor"
          label="Vendor"
        >
          <MenuItem value="all">All Vendors</MenuItem>
          {vendors.map((v) => (
            <MenuItem key={v.id} value={v.id}>
              {v.name}
            </MenuItem>
          ))}
        </Picker>
      </FormField>

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
    </Card>
  );
};
