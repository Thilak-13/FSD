// tests/pages/Invoices.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { InvoicesPage } from '../../src/pages/Invoices/InvoicesPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { setMockDelayEnabled, resetInvoices, INITIAL_INVOICES } from '../../src/services/mockApi';

// Helper component to track navigation destination
const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
};

const renderInvoicesPage = (initialRole: 'Requester' | 'Approver' | 'Admin' = 'Requester') => {
  return render(
    <MemoryRouter initialEntries={['/invoices']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/invoices" element={<InvoicesPage />} />
            <Route
              path="/invoices/:id"
              element={
                <div>
                  <div data-testid="page-invoice-detail">Invoice Detail</div>
                  <LocationDisplay />
                </div>
              }
            />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('InvoicesPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
  });

  it('renders invoice header, count badge, and new invoice trigger', async () => {
    renderInvoicesPage();

    expect(screen.getByRole('heading', { name: /Invoices/i })).toBeDefined();
    expect(screen.getByTestId('new-invoice-trigger')).toBeDefined();
    expect(screen.getByText(/\+ New Invoice/i)).toBeDefined();

    await waitFor(() => {
      const badge = screen.getByTestId('invoices-count-badge');
      expect(badge).toBeDefined();
      expect(badge.getAttribute('aria-live')).toBe('polite');
    });
  });

  it('renders table columns and loads invoices with formatted data', async () => {
    renderInvoicesPage('Admin');

    await waitFor(() => {
      expect(screen.getByText('INV-2026-001')).toBeDefined();
    });

    // Check table headers
    expect(screen.getByText('Invoice #')).toBeDefined();
    expect(screen.getByText('Vendor Name')).toBeDefined();
    expect(screen.getByText('Total Amount')).toBeDefined();
    expect(screen.getByText('Submitted Date')).toBeDefined();
    expect(screen.getByText('Due Date')).toBeDefined();
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
    expect(screen.getByText('Action')).toBeDefined();

    // Check data rows
    expect(screen.getAllByText('Apex Cloud Services').length).toBeGreaterThan(0);
    expect(screen.getByText('₹6,500.00')).toBeDefined();
    expect(screen.getAllByText(INITIAL_INVOICES[0].submittedDate).length).toBeGreaterThan(0);
  });

  describe('Role-Based Visibility', () => {
    it('enforces Requester visibility: only shows invoices submitted by current user (user-3)', async () => {
      renderInvoicesPage('Requester');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      // INV-2026-001 is submitted by user-3 -> visible
      expect(screen.getByText('INV-2026-001')).toBeDefined();

      // INV-2026-006 and INV-2026-010 were submitted by user-1 (Admin) -> NOT visible to Requester
      expect(screen.queryByText('INV-2026-006')).toBeNull();
      expect(screen.queryByText('INV-2026-010')).toBeNull();
    });

    it('allows Approver to see all invoices regardless of submitter', async () => {
      renderInvoicesPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      // Both user-3 and user-1 invoices should be visible
      expect(screen.getByText('INV-2026-006')).toBeDefined();
    });

    it('allows Admin to see all invoices regardless of submitter', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      expect(screen.getByText('INV-2026-006')).toBeDefined();
    });
  });

  describe('Filtering Toolbar', () => {
    it('filters invoices by search query matching invoice number', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const searchInput = screen.getByTestId('invoice-search-input');
      fireEvent.change(searchInput, { target: { value: 'INV-2026-003' } });

      await waitFor(() => {
        expect(screen.getByText('INV-2026-003')).toBeDefined();
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });
    });

    it('filters invoices by search query matching vendor name', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const searchInput = screen.getByTestId('invoice-search-input');
      fireEvent.change(searchInput, { target: { value: 'ByteForce' } });

      await waitFor(() => {
        expect(screen.getByText('INV-2026-003')).toBeDefined();
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });
    });

    it('filters invoices by search query matching line item description', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const searchInput = screen.getByTestId('invoice-search-input');
      fireEvent.change(searchInput, { target: { value: 'Clean Air Filtration' } });

      await waitFor(() => {
        expect(screen.getByText('INV-2026-006')).toBeDefined();
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });
    });

    it('filters invoices by status dropdown', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const statusSelect = screen.getByTestId('invoice-status-filter');
      fireEvent.change(statusSelect, { target: { value: 'Flagged' } });

      await waitFor(() => {
        // Flagged invoices should be present
        expect(screen.getByText('INV-2026-011')).toBeDefined();
        // Submitted invoices should be hidden
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });
    });

    it('filters invoices by vendor dropdown', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const vendorSelect = screen.getByTestId('invoice-vendor-filter');
      // vendor-2 is Northwest Logistics
      fireEvent.change(vendorSelect, { target: { value: 'vendor-2' } });

      await waitFor(() => {
        expect(screen.getByText('INV-2026-002')).toBeDefined();
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });
    });

    it('resets all filters when Clear Filters button is clicked', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const statusSelect = screen.getByTestId('invoice-status-filter');
      fireEvent.change(statusSelect, { target: { value: 'Flagged' } });

      await waitFor(() => {
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });

      const clearBtn = screen.getByTestId('clear-filters-button');
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });
    });

    it('renders accessible EmptyState when no records match filter, and allows clearing from EmptyState', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const searchInput = screen.getByTestId('invoice-search-input');
      fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_FILTER_VALUE_XYZ' } });

      await waitFor(() => {
        expect(screen.getByText('No Invoices Found')).toBeDefined();
      });

      // Clear filters via empty state action button
      const emptyStateClearBtn = screen.getAllByRole('button', { name: /clear filters/i })[0];
      fireEvent.click(emptyStateClearBtn);

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to /invoices/:id when View Details action button is clicked', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('view-details-inv-1')).toBeDefined();
      });

      const viewDetailsBtn = screen.getByTestId('view-details-inv-1');
      fireEvent.click(viewDetailsBtn);

      await waitFor(() => {
        expect(screen.getByTestId('page-invoice-detail')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/invoices/inv-1');
      });
    });

    it('navigates to /invoices/:id when a table row is clicked', async () => {
      renderInvoicesPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const invoiceCell = screen.getByText('INV-2026-001');
      fireEvent.click(invoiceCell);

      await waitFor(() => {
        expect(screen.getByTestId('page-invoice-detail')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/invoices/inv-1');
      });
    });
  });

  describe('Invoice Submission Dialog', () => {
    it('opens modal dialog on clicking + New Invoice and closes on close button', async () => {
      renderInvoicesPage();

      const newInvoiceBtn = screen.getByTestId('new-invoice-trigger');
      fireEvent.click(newInvoiceBtn);

      expect(screen.getByTestId('invoice-form-dialog')).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Submit New Invoice' })).toBeDefined();

      const closeBtn = screen.getByTestId('close-invoice-dialog');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('invoice-form-dialog')).toBeNull();
    });

    it('closes modal dialog when Cancel button is clicked', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));
      expect(screen.getByTestId('invoice-form-dialog')).toBeDefined();

      const cancelBtn = screen.getByTestId('cancel-invoice-button');
      fireEvent.click(cancelBtn);

      expect(screen.queryByTestId('invoice-form-dialog')).toBeNull();
    });

    it('closes modal dialog when Escape key is pressed', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));
      expect(screen.getByTestId('invoice-form-dialog')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(screen.queryByTestId('invoice-form-dialog')).toBeNull();
    });

    it('saves previous activeElement on modal open and restores focus on modal close', async () => {
      renderInvoicesPage();

      const triggerBtn = screen.getByTestId('new-invoice-trigger');
      const focusSpy = vi.spyOn(triggerBtn, 'focus');
      triggerBtn.focus();
      fireEvent.click(triggerBtn);

      expect(screen.getByTestId('invoice-form-dialog')).toBeDefined();

      const closeBtn = screen.getByTestId('close-invoice-dialog');
      fireEvent.click(closeBtn);

      expect(screen.queryByTestId('invoice-form-dialog')).toBeNull();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('guards against NaN when non-finite or empty inputs are entered in line items', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));

      const qtyInput0 = screen.getByTestId('line-item-qty-0');
      const priceInput0 = screen.getByTestId('line-item-price-0');

      fireEvent.change(qtyInput0, { target: { value: 'invalid' } });
      fireEvent.change(priceInput0, { target: { value: '' } });

      // Total should safely be ₹0.00, not ₹NaN
      expect(screen.getByTestId('line-item-total-0').textContent).toBe('₹0.00');
      expect(screen.getByTestId('invoice-aggregate-total').textContent).toBe('₹0.00');
    });

    it('filters Purchase Orders matching selected vendor', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));
      await waitFor(() => {
        expect(screen.getByTestId('invoice-vendor-select')).toBeDefined();
      });

      const vendorSelect = screen.getByTestId('invoice-vendor-select');
      const poSelect = screen.getByTestId('invoice-po-select') as HTMLSelectElement;

      // Initially with no vendor selected, poSelect is disabled
      expect(poSelect.disabled).toBe(true);

      // Select vendor-1 (Apex Cloud Services, has po-1 and po-2)
      fireEvent.change(vendorSelect, { target: { value: 'vendor-1' } });

      expect(poSelect.disabled).toBe(false);
      const options = Array.from(poSelect.options).map((opt) => opt.text);
      expect(options.some((txt) => txt.includes('PO-2026-001'))).toBe(true);
      expect(options.some((txt) => txt.includes('PO-2026-002'))).toBe(true);
    });

    it('dynamically manages line items: adds, removes, and calculates total amount', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));

      // Initially 1 line item row
      expect(screen.getByTestId('line-item-row-0')).toBeDefined();
      expect(screen.queryByTestId('line-item-row-1')).toBeNull();

      // Enter Description, Qty=2, Unit Price=500
      const descInput0 = screen.getByTestId('line-item-desc-0');
      const qtyInput0 = screen.getByTestId('line-item-qty-0');
      const priceInput0 = screen.getByTestId('line-item-price-0');

      fireEvent.change(descInput0, { target: { value: 'Consulting Hours' } });
      fireEvent.change(qtyInput0, { target: { value: '2' } });
      fireEvent.change(priceInput0, { target: { value: '500' } });

      expect(screen.getByTestId('line-item-total-0').textContent).toBe('₹1000.00');
      expect(screen.getByTestId('invoice-aggregate-total').textContent).toBe('₹1000.00');

      // Add second item
      const addItemBtn = screen.getByTestId('add-line-item-button');
      fireEvent.click(addItemBtn);

      expect(screen.getByTestId('line-item-row-1')).toBeDefined();

      const descInput1 = screen.getByTestId('line-item-desc-1');
      const qtyInput1 = screen.getByTestId('line-item-qty-1');
      const priceInput1 = screen.getByTestId('line-item-price-1');

      fireEvent.change(descInput1, { target: { value: 'Software License' } });
      fireEvent.change(qtyInput1, { target: { value: '3' } });
      fireEvent.change(priceInput1, { target: { value: '250' } });

      expect(screen.getByTestId('line-item-total-1').textContent).toBe('₹750.00');
      expect(screen.getByTestId('invoice-aggregate-total').textContent).toBe('₹1750.00');

      // Remove first item
      const removeBtn0 = screen.getByTestId('remove-line-item-0');
      fireEvent.click(removeBtn0);

      // Remaining item is now the only item
      expect(screen.queryByTestId('line-item-row-1')).toBeNull();
      expect(screen.getByTestId('invoice-aggregate-total').textContent).toBe('₹750.00');
    });

    it('simulates document attachment stub and allows clearing file', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));

      const fileInput = screen.getByTestId('invoice-file-input') as HTMLInputElement;
      const file = new File(['dummy content'], 'invoice-test-doc.pdf', {
        type: 'application/pdf',
      });

      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByTestId('attachment-badge')).toBeDefined();
      expect(screen.getByTestId('attachment-name').textContent).toContain('invoice-test-doc.pdf');

      // Remove attachment
      const removeFileBtn = screen.getByTestId('remove-attachment-btn');
      fireEvent.click(removeFileBtn);

      expect(screen.queryByTestId('attachment-badge')).toBeNull();
    });

    it('validates required fields on submit and displays error alerts', async () => {
      renderInvoicesPage();

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));

      const submitBtn = screen.getByTestId('submit-invoice-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Please select a vendor')).toBeDefined();
        expect(screen.getByText('Due date is required')).toBeDefined();
      });
    });

    it('successfully submits new invoice, closes dialog, and displays success toast', async () => {
      renderInvoicesPage('Requester');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('new-invoice-trigger'));

      // Fill in Vendor
      const vendorSelect = screen.getByTestId('invoice-vendor-select');
      fireEvent.change(vendorSelect, { target: { value: 'vendor-1' } });

      // Fill in Due Date
      const dueDateInput = screen.getByTestId('invoice-due-date-input');
      fireEvent.change(dueDateInput, { target: { value: '2026-11-15' } });

      // Fill in Invoice Number
      const invoiceNumInput = screen.getByTestId('invoice-number-input');
      fireEvent.change(invoiceNumInput, { target: { value: 'INV-2026-999' } });

      // Fill in Line Item
      const descInput = screen.getByTestId('line-item-desc-0');
      const qtyInput = screen.getByTestId('line-item-qty-0');
      const priceInput = screen.getByTestId('line-item-price-0');

      fireEvent.change(descInput, { target: { value: 'Enterprise Maintenance SLA' } });
      fireEvent.change(qtyInput, { target: { value: '1' } });
      fireEvent.change(priceInput, { target: { value: '3500' } });

      // Submit
      const submitBtn = screen.getByTestId('submit-invoice-button');
      fireEvent.click(submitBtn);

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('invoice-form-dialog')).toBeNull();
      });

      // Toast notification should be displayed
      expect(screen.getByTestId('invoice-toast-message')).toBeDefined();
      expect(screen.getByText(/Invoice INV-2026-999 was successfully submitted/i)).toBeDefined();

      // Newly submitted invoice should now appear in the table
      await waitFor(() => {
        expect(screen.getByText('INV-2026-999')).toBeDefined();
        expect(screen.getByText('₹3,500.00')).toBeDefined();
      });
    });
  });
});
