// tests/pages/Vendors.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { VendorsPage } from '../../src/pages/Vendors/VendorsPage';
import { VendorDetailPage } from '../../src/pages/VendorDetail/VendorDetailPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { setMockDelayEnabled, resetVendors, resetPurchaseOrders, resetInvoices, createVendor } from '../../src/services/mockApi';

const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
};

const renderVendorsPage = (initialRole: 'Requester' | 'Approver' | 'Admin' = 'Admin') => {
  return render(
    <MemoryRouter initialEntries={['/vendors']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/vendors" element={<VendorsPage />} />
            <Route
              path="/vendors/:id"
              element={
                <div>
                  <div data-testid="page-vendor-detail">Vendor Detail</div>
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

const renderVendorDetailPage = (vendorId = 'vendor-1', initialRole: 'Requester' | 'Approver' | 'Admin' = 'Admin') => {
  return render(
    <MemoryRouter initialEntries={[`/vendors/${vendorId}`]}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/vendors/:id" element={<VendorDetailPage />} />
            <Route
              path="/vendors"
              element={
                <div>
                  <div data-testid="page-vendors">Vendors Directory</div>
                  <LocationDisplay />
                </div>
              }
            />
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

describe('VendorsPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetVendors();
    resetPurchaseOrders();
    resetInvoices();
  });

  describe('Directory Rendering & Data Display', () => {
    it('renders vendor directory header and initial vendors list', async () => {
      renderVendorsPage('Admin');

      expect(screen.getByRole('heading', { name: /Vendor Directory/i })).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      expect(screen.getByText('Northwest Logistics')).toBeDefined();
      expect(screen.getByText('ByteForce Technologies')).toBeDefined();
      expect(screen.getByText('Summit Creative')).toBeDefined();
      expect(screen.getByText('Pioneer Industrial')).toBeDefined();

      // Check count badge
      const countBadge = screen.getByTestId('vendors-count-badge');
      expect(countBadge.textContent).toContain('5 Vendors');
    });

    it('renders table headers for all standard vendor attributes', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      expect(screen.getByText('Vendor Name')).toBeDefined();
      expect(screen.getByText('Payment Terms')).toBeDefined();
      expect(screen.getByText('Contact Email')).toBeDefined();
      expect(screen.getByText('Tax ID')).toBeDefined();
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
      expect(screen.getByText('Actions')).toBeDefined();

      // Check formatted row content
      expect(screen.getByText('billing@apexcloud.io')).toBeDefined();
      expect(screen.getByText('94-3289104')).toBeDefined();
      expect(screen.getAllByText('Net 30').length).toBeGreaterThan(0);
    });

    it('is accessible to all authenticated roles (Requester, Approver, Admin)', async () => {
      const { unmount: unmountRequester } = renderVendorsPage('Requester');
      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });
      unmountRequester();

      const { unmount: unmountApprover } = renderVendorsPage('Approver');
      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });
      unmountApprover();

      renderVendorsPage('Admin');
      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });
    });
  });

  describe('Role-Based "+ Add Vendor" Button Visibility', () => {
    it('shows "+ Add Vendor" button for Admin role', async () => {
      renderVendorsPage('Admin');

      expect(screen.getByTestId('add-vendor-trigger')).toBeDefined();
      expect(screen.getByText(/\+ Add Vendor/i)).toBeDefined();
    });

    it('hides "+ Add Vendor" button for Requester role', async () => {
      renderVendorsPage('Requester');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      expect(screen.queryByTestId('add-vendor-trigger')).toBeNull();
      expect(screen.queryByText(/\+ Add Vendor/i)).toBeNull();
    });

    it('hides "+ Add Vendor" button for Approver role', async () => {
      renderVendorsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      expect(screen.queryByTestId('add-vendor-trigger')).toBeNull();
      expect(screen.queryByText(/\+ Add Vendor/i)).toBeNull();
    });
  });

  describe('Search & Filtering', () => {
    it('filters vendors by name search query', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      const searchInput = screen.getByTestId('vendor-search-input');
      fireEvent.change(searchInput, { target: { value: 'ByteForce' } });

      await waitFor(() => {
        expect(screen.getByText('ByteForce Technologies')).toBeDefined();
        expect(screen.queryByText('Apex Cloud Services')).toBeNull();
        expect(screen.queryByText('Northwest Logistics')).toBeNull();
      });
    });

    it('filters vendors by contact email search query', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      const searchInput = screen.getByTestId('vendor-search-input');
      fireEvent.change(searchInput, { target: { value: 'northwestlogistics.com' } });

      await waitFor(() => {
        expect(screen.getByText('Northwest Logistics')).toBeDefined();
        expect(screen.queryByText('Apex Cloud Services')).toBeNull();
      });
    });

    it('filters vendors by tax ID search query', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      const searchInput = screen.getByTestId('vendor-search-input');
      fireEvent.change(searchInput, { target: { value: '38-6543219' } });

      await waitFor(() => {
        expect(screen.getByText('Pioneer Industrial')).toBeDefined();
        expect(screen.queryByText('Apex Cloud Services')).toBeNull();
      });
    });

    it('clears search query and restores full vendor list', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      const searchInput = screen.getByTestId('vendor-search-input');
      fireEvent.change(searchInput, { target: { value: 'Pioneer' } });

      await waitFor(() => {
        expect(screen.queryByText('Apex Cloud Services')).toBeNull();
      });

      const clearBtn = screen.getByTestId('clear-search-button');
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
        expect(screen.getByText('Pioneer Industrial')).toBeDefined();
      });
    });

    it('displays EmptyState when no vendors match query', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      const searchInput = screen.getByTestId('vendor-search-input');
      fireEvent.change(searchInput, { target: { value: 'NON_EXISTENT_VENDOR_XYZ' } });

      await waitFor(() => {
        expect(screen.getByText('No Vendors Found')).toBeDefined();
      });
    });
  });

  describe('Navigation', () => {
    it('navigates to /vendors/:id on clicking "View Details" button', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('view-details-vendor-1')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('view-details-vendor-1'));

      await waitFor(() => {
        expect(screen.getByTestId('page-vendor-detail')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/vendors/vendor-1');
      });
    });

    it('navigates to /vendors/:id on clicking a table row', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      fireEvent.click(screen.getByText('Apex Cloud Services'));

      await waitFor(() => {
        expect(screen.getByTestId('page-vendor-detail')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/vendors/vendor-1');
      });
    });
  });

  describe('Add Vendor Dialog & Submission', () => {
    it('opens modal on clicking "+ Add Vendor" and closes on close button', async () => {
      renderVendorsPage('Admin');

      fireEvent.click(screen.getByTestId('add-vendor-trigger'));

      expect(screen.getByTestId('vendor-form-dialog')).toBeDefined();
      expect(screen.getByRole('heading', { name: 'Add New Vendor' })).toBeDefined();

      fireEvent.click(screen.getByTestId('close-vendor-dialog'));
      expect(screen.queryByTestId('vendor-form-dialog')).toBeNull();
    });

    it('closes modal on clicking Cancel button', async () => {
      renderVendorsPage('Admin');

      fireEvent.click(screen.getByTestId('add-vendor-trigger'));
      expect(screen.getByTestId('vendor-form-dialog')).toBeDefined();

      fireEvent.click(screen.getByTestId('cancel-vendor-button'));
      expect(screen.queryByTestId('vendor-form-dialog')).toBeNull();
    });

    it('closes modal on pressing Escape key', async () => {
      renderVendorsPage('Admin');

      fireEvent.click(screen.getByTestId('add-vendor-trigger'));
      expect(screen.getByTestId('vendor-form-dialog')).toBeDefined();

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByTestId('vendor-form-dialog')).toBeNull();
    });

    it('restores focus to trigger button upon modal close', async () => {
      renderVendorsPage('Admin');

      const triggerBtn = screen.getByTestId('add-vendor-trigger');
      const focusSpy = vi.spyOn(triggerBtn, 'focus');
      triggerBtn.focus();
      fireEvent.click(triggerBtn);

      expect(screen.getByTestId('vendor-form-dialog')).toBeDefined();

      fireEvent.click(screen.getByTestId('close-vendor-dialog'));
      expect(screen.queryByTestId('vendor-form-dialog')).toBeNull();
      expect(focusSpy).toHaveBeenCalled();
    });

    it('validates required fields (Company Name, Contact Email, Tax ID)', async () => {
      renderVendorsPage('Admin');

      fireEvent.click(screen.getByTestId('add-vendor-trigger'));

      const submitBtn = screen.getByTestId('submit-vendor-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Company name is required')).toBeDefined();
        expect(screen.getByText('Contact email is required')).toBeDefined();
        expect(screen.getByText('Tax ID is required')).toBeDefined();
      });
    });

    it('validates email format', async () => {
      renderVendorsPage('Admin');

      fireEvent.click(screen.getByTestId('add-vendor-trigger'));

      fireEvent.change(screen.getByTestId('vendor-name-input'), {
        target: { value: 'Global Logistics' },
      });
      fireEvent.change(screen.getByTestId('vendor-email-input'), {
        target: { value: 'not-an-email' },
      });
      fireEvent.change(screen.getByTestId('vendor-tax-id-input'), {
        target: { value: '11-2233445' },
      });

      fireEvent.click(screen.getByTestId('submit-vendor-button'));

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeDefined();
      });
    });

    it('submits valid vendor, closes dialog, shows toast, and adds new vendor to table', async () => {
      renderVendorsPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('add-vendor-trigger'));

      // Fill form
      fireEvent.change(screen.getByTestId('vendor-name-input'), {
        target: { value: 'Global Freight Systems' },
      });
      fireEvent.change(screen.getByTestId('vendor-email-input'), {
        target: { value: 'contact@globalfreight.io' },
      });
      fireEvent.change(screen.getByTestId('vendor-tax-id-input'), {
        target: { value: '88-9988776' },
      });
      fireEvent.change(screen.getByTestId('vendor-payment-terms-select'), {
        target: { value: 'Net 45' },
      });
      fireEvent.change(screen.getByTestId('vendor-address-input'), {
        target: { value: '700 Harbor Way, Miami, FL 33101' },
      });
      fireEvent.change(screen.getByTestId('vendor-phone-input'), {
        target: { value: '+1 (305) 555-0199' },
      });

      // Submit
      fireEvent.click(screen.getByTestId('submit-vendor-button'));

      // Dialog should close
      await waitFor(() => {
        expect(screen.queryByTestId('vendor-form-dialog')).toBeNull();
      });

      // Toast notification displayed
      expect(screen.getByTestId('vendor-toast-message')).toBeDefined();
      expect(screen.getByText(/Vendor "Global Freight Systems" was successfully registered/i)).toBeDefined();

      // New vendor appears in table
      await waitFor(() => {
        expect(screen.getByText('Global Freight Systems')).toBeDefined();
        expect(screen.getByText('contact@globalfreight.io')).toBeDefined();
        expect(screen.getByText('88-9988776')).toBeDefined();
      });
    });
  });

  describe('Fallback Rendering', () => {
    it('renders fallback when DataContext is not provided', () => {
      render(
        <MemoryRouter>
          <VendorsPage />
        </MemoryRouter>
      );
      expect(screen.getByTestId('page-vendors')).toBeDefined();
    });
  });
});

describe('VendorDetailPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetVendors();
    resetPurchaseOrders();
    resetInvoices();
  });

  it('renders vendor details with header metadata and back button', async () => {
    renderVendorDetailPage('vendor-1');

    await waitFor(() => {
      expect(screen.getByTestId('vendor-name').textContent).toBe('Apex Cloud Services');
    });

    expect(screen.getByTestId('vendor-payment-terms').textContent).toBe('Net 30');
    expect(screen.getByTestId('vendor-tax-id').textContent).toBe('94-3289104');
    expect(screen.getByTestId('vendor-email').textContent).toBe('billing@apexcloud.io');
    expect(screen.getByTestId('vendor-phone').textContent).toBe('+1 (415) 555-0192');
    expect(screen.getByTestId('vendor-address').textContent).toContain('500 Howard St');

    // Back button
    expect(screen.getByTestId('vendor-back-button')).toBeDefined();
  });

  it('navigates back to /vendors when back button is clicked', async () => {
    renderVendorDetailPage('vendor-1');

    await waitFor(() => {
      expect(screen.getByTestId('vendor-name')).toBeDefined();
    });

    fireEvent.click(screen.getByTestId('vendor-back-button'));

    await waitFor(() => {
      expect(screen.getByTestId('page-vendors')).toBeDefined();
      expect(screen.getByTestId('current-route').textContent).toBe('/vendors');
    });
  });

  it('renders active purchase orders section filtered by vendorId', async () => {
    renderVendorDetailPage('vendor-1');

    await waitFor(() => {
      expect(screen.getByTestId('vendor-pos-section')).toBeDefined();
    });

    // vendor-1 has PO-2026-001 and PO-2026-002
    expect(screen.getByText('PO-2026-001')).toBeDefined();
    expect(screen.getByText('PO-2026-002')).toBeDefined();

    // PO-2026-003 belongs to vendor-2, should NOT be shown here
    expect(screen.queryByText('PO-2026-003')).toBeNull();
  });

  it('renders historical invoices section filtered by vendorId with view invoice link', async () => {
    renderVendorDetailPage('vendor-1');

    await waitFor(() => {
      expect(screen.getByTestId('vendor-invoices-section')).toBeDefined();
    });

    // vendor-1 has INV-2026-001
    expect(screen.getByText('INV-2026-001')).toBeDefined();

    // Clicking View Invoice navigates to /invoices/:id
    const viewInvoiceBtn = screen.getByTestId('view-invoice-inv-1');
    fireEvent.click(viewInvoiceBtn);

    await waitFor(() => {
      expect(screen.getByTestId('page-invoice-detail')).toBeDefined();
      expect(screen.getByTestId('current-route').textContent).toBe('/invoices/inv-1');
    });
  });

  it('switches between tabs (Overview, Purchase Orders, Invoices)', async () => {
    renderVendorDetailPage('vendor-1');

    await waitFor(() => {
      expect(screen.getByTestId('vendor-name')).toBeDefined();
    });

    // Click Purchase Orders Tab
    fireEvent.click(screen.getByTestId('tab-pos'));
    expect(screen.getByTestId('vendor-pos-section')).toBeDefined();
    expect(screen.queryByTestId('vendor-invoices-section')).toBeNull();

    // Click Invoices Tab
    fireEvent.click(screen.getByTestId('tab-invoices'));
    expect(screen.getByTestId('vendor-invoices-section')).toBeDefined();
    expect(screen.queryByTestId('vendor-pos-section')).toBeNull();

    // Click Overview Tab
    fireEvent.click(screen.getByTestId('tab-all'));
    expect(screen.getByTestId('vendor-pos-section')).toBeDefined();
    expect(screen.getByTestId('vendor-invoices-section')).toBeDefined();
  });

  it('renders accessible EmptyState when vendor has no purchase orders or invoices', async () => {
    const newVendor = await createVendor({
      name: 'Fresh Start Supplies',
      contactEmail: 'orders@freshstart.com',
      paymentTerms: 'Net 30',
      address: '100 Green St, Boston, MA 02110',
      taxId: '04-1234567',
    });

    renderVendorDetailPage(newVendor.id);

    await waitFor(() => {
      expect(screen.getByTestId('vendor-name').textContent).toBe('Fresh Start Supplies');
    });

    // Check EmptyState for POs
    expect(screen.getByText('No Purchase Orders')).toBeDefined();
    expect(screen.getByText(/There are no active purchase orders for this vendor/i)).toBeDefined();

    // Check EmptyState for Invoices
    expect(screen.getByText('No Invoices Found')).toBeDefined();
    expect(screen.getByText(/There is no invoice history for this vendor/i)).toBeDefined();
  });

  it('renders EmptyState when vendor ID does not exist', async () => {
    renderVendorDetailPage('non-existent-vendor-id');

    await waitFor(() => {
      expect(screen.getByText('Vendor Not Found')).toBeDefined();
      expect(screen.getByText(/No vendor could be found with ID "non-existent-vendor-id"/i)).toBeDefined();
    });

    // Can click Return to Directory
    const returnBtn = screen.getByRole('button', { name: /Return to Directory/i });
    fireEvent.click(returnBtn);

    await waitFor(() => {
      expect(screen.getByTestId('page-vendors')).toBeDefined();
    });
  });

  it('renders fallback when DataContext is not provided', () => {
    render(
      <MemoryRouter>
        <VendorDetailPage />
      </MemoryRouter>
    );
    expect(screen.getByTestId('page-vendor-detail')).toBeDefined();
  });
});
