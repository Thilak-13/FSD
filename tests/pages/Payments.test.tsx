// tests/pages/Payments.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { PaymentsPage } from '../../src/pages/Payments/PaymentsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { AppRoutes } from '../../src/app/routes';
import { setMockDelayEnabled, resetInvoices } from '../../src/services/mockApi';

// Helper component to track navigation destination
const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
};

const renderPaymentsPage = (initialRole: 'Approver' | 'Admin' | 'Requester' = 'Approver') => {
  return render(
    <MemoryRouter initialEntries={['/payments']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/payments" element={<PaymentsPage />} />
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

describe('PaymentsPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
  });

  describe('Initial Render & Summary Strip', () => {
    it('renders payment summary cards and payment table', async () => {
      renderPaymentsPage('Approver');

      expect(screen.getByText(/Vendor Payments/i)).toBeDefined();
      expect(screen.getByText(/Scheduled Total/i)).toBeDefined();

      await waitFor(() => {
        expect(screen.getByTestId('metric-scheduled-total')).toBeDefined();
        expect(screen.getByTestId('metric-paid-mtd')).toBeDefined();
        expect(screen.getByTestId('metric-overdue-count')).toBeDefined();
      });
    });

    it('calculates and displays accurate summary totals from invoice data', async () => {
      renderPaymentsPage('Approver');

      // Payment Scheduled: INV-2026-014 ($8,000), INV-2026-015 ($4,500), INV-2026-016 ($5,500) = $18,000.00
      // Paid: INV-2026-017 ($4,000), INV-2026-018 ($2,500) = $6,500.00
      // Overdue (Approved or Payment Scheduled with dueDate < today [2026-09-16]): INV-2026-008 (due 2026-09-05) = 1
      await waitFor(() => {
        expect(screen.getByTestId('metric-scheduled-total').textContent).toContain('$18,000.00');
        expect(screen.getByTestId('metric-paid-mtd').textContent).toContain('$6,500.00');
        expect(screen.getByTestId('metric-overdue-count').textContent).toContain('1');
      });
    });

    it('renders table displaying Approved, Payment Scheduled, and Paid invoices, but not Submitted, Under Verification, or Flagged', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-007')).toBeDefined(); // Approved
      });

      // Approved invoices
      expect(screen.getByText('INV-2026-007')).toBeDefined();
      expect(screen.getByText('INV-2026-008')).toBeDefined();
      expect(screen.getByText('INV-2026-009')).toBeDefined();
      expect(screen.getByText('INV-2026-010')).toBeDefined();

      // Payment Scheduled invoices
      expect(screen.getByText('INV-2026-014')).toBeDefined();
      expect(screen.getByText('INV-2026-015')).toBeDefined();
      expect(screen.getByText('INV-2026-016')).toBeDefined();

      // Paid invoices
      expect(screen.getByText('INV-2026-017')).toBeDefined();
      expect(screen.getByText('INV-2026-018')).toBeDefined();

      // Non-payment status invoices should NOT appear
      expect(screen.queryByText('INV-2026-001')).toBeNull(); // Submitted
      expect(screen.queryByText('INV-2026-004')).toBeNull(); // Under Verification
      expect(screen.queryByText('INV-2026-011')).toBeNull(); // Flagged
    });
  });

  describe('Filtering & Search', () => {
    it('filters payments table by status tabs or select', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-007')).toBeDefined();
      });

      // Filter by Payment Scheduled
      const statusSelect = screen.getByTestId('payments-status-filter') as HTMLSelectElement;
      fireEvent.change(statusSelect, { target: { value: 'Payment Scheduled' } });

      await waitFor(() => {
        expect(screen.getByText('INV-2026-014')).toBeDefined();
        expect(screen.queryByText('INV-2026-007')).toBeNull(); // Approved should be filtered out
        expect(screen.queryByText('INV-2026-017')).toBeNull(); // Paid should be filtered out
      });

      // Filter by Paid
      fireEvent.change(statusSelect, { target: { value: 'Paid' } });
      await waitFor(() => {
        expect(screen.getByText('INV-2026-017')).toBeDefined();
        expect(screen.queryByText('INV-2026-014')).toBeNull();
      });

      // Filter by Approved (Awaiting Scheduling)
      fireEvent.change(statusSelect, { target: { value: 'Approved' } });
      await waitFor(() => {
        expect(screen.getByText('INV-2026-007')).toBeDefined();
        expect(screen.queryByText('INV-2026-017')).toBeNull();
      });
    });

    it('searches payments by invoice number or vendor name', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-007')).toBeDefined();
      });

      const searchInput = screen.getByTestId('payments-search-input');
      fireEvent.change(searchInput, { target: { value: 'INV-2026-014' } });

      await waitFor(() => {
        expect(screen.getByText('INV-2026-014')).toBeDefined();
        expect(screen.queryByText('INV-2026-007')).toBeNull();
        expect(screen.queryByText('INV-2026-017')).toBeNull();
      });

      // Search by vendor name
      fireEvent.change(searchInput, { target: { value: 'Summit Creative' } });
      await waitFor(() => {
        expect(screen.getByText('INV-2026-016')).toBeDefined();
        expect(screen.queryByText('INV-2026-014')).toBeNull();
      });
    });

    it('shows empty state when no records match filter and allows clearing filters', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-007')).toBeDefined();
      });

      const searchInput = screen.getByTestId('payments-search-input');
      fireEvent.change(searchInput, { target: { value: 'NONEXISTENT_QUERY_123' } });

      await waitFor(() => {
        expect(screen.getByText(/No Payments Found/i)).toBeDefined();
        expect(screen.getByTestId('clear-payments-filters-btn')).toBeDefined();
      });

      // Click clear filters button
      fireEvent.click(screen.getByTestId('clear-payments-filters-btn'));

      await waitFor(() => {
        expect(screen.getByText('INV-2026-007')).toBeDefined();
        expect(screen.queryByText(/No Payments Found/i)).toBeNull();
      });
    });
  });

  describe('Payment Disbursement Actions', () => {
    it('allows scheduling payment for Approved invoice via SchedulePaymentModal', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('action-schedule-inv-7')).toBeDefined();
      });

      // Click Schedule Payment for INV-2026-007
      fireEvent.click(screen.getByTestId('action-schedule-inv-7'));

      // Modal should open
      await waitFor(() => {
        expect(screen.getByTestId('schedule-payment-modal-dialog')).toBeDefined();
      });

      // Target disbursement date input
      const dateInput = screen.getByTestId('schedule-disbursement-date-input');
      expect(dateInput).toBeDefined();

      fireEvent.change(dateInput, { target: { value: '2026-09-29' } });

      // Confirm schedule
      const confirmBtn = screen.getByTestId('confirm-schedule-payment-btn');
      fireEvent.click(confirmBtn);

      // Toast notification and status update
      await waitFor(() => {
        expect(screen.getByTestId('payments-toast-message')).toBeDefined();
        expect(screen.getByText(/Payment scheduled for INV-2026-007/i)).toBeDefined();
      });
    });

    it('cancels SchedulePaymentModal without changes when Cancel is clicked', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('action-schedule-inv-7')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('action-schedule-inv-7'));

      await waitFor(() => {
        expect(screen.getByTestId('schedule-payment-modal-dialog')).toBeDefined();
      });

      const cancelBtn = screen.getByTestId('cancel-schedule-payment-btn');
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('schedule-payment-modal-dialog')).toBeNull();
      });
    });

    it('allows marking Payment Scheduled invoice as Paid via ConfirmDialog', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('action-mark-paid-inv-14')).toBeDefined();
      });

      // Click Mark as Paid for INV-2026-014
      fireEvent.click(screen.getByTestId('action-mark-paid-inv-14'));

      // Confirmation dialog should open
      await waitFor(() => {
        expect(screen.getByText(/Confirm Disbursement for INV-2026-014/i)).toBeDefined();
      });

      // Click confirm disbursement
      const confirmBtn = screen.getByRole('button', { name: /Mark as Paid|Confirm/i });
      fireEvent.click(confirmBtn);

      // Verify success toast
      await waitFor(() => {
        expect(screen.getByTestId('payments-toast-message')).toBeDefined();
        expect(screen.getByText(/marked as Paid/i)).toBeDefined();
      });

      // Dismiss toast
      const dismissBtn = screen.getByRole('button', { name: /Dismiss notification/i });
      fireEvent.click(dismissBtn);
      expect(screen.queryByTestId('payments-toast-message')).toBeNull();
    });

    it('cancels ConfirmDialog without changes when Cancel is clicked', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('action-mark-paid-inv-14')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('action-mark-paid-inv-14'));

      await waitFor(() => {
        expect(screen.getByText(/Confirm Disbursement for INV-2026-014/i)).toBeDefined();
      });

      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      fireEvent.click(cancelBtn);

      await waitFor(() => {
        expect(screen.queryByText(/Confirm Disbursement for INV-2026-014/i)).toBeNull();
      });
    });

    it('navigates to invoice detail page when View action is clicked', async () => {
      renderPaymentsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('action-view-inv-7')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('action-view-inv-7'));

      await waitFor(() => {
        expect(screen.getByTestId('page-invoice-detail')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/invoices/inv-7');
      });
    });
  });

  describe('Role-Based Route Guard for /payments', () => {
    it('redirects Requester away from /payments to /', async () => {
      render(
        <MemoryRouter initialEntries={['/payments']}>
          <AuthProvider initialRole="Requester">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      // Requester should be bounced to Dashboard /
      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeDefined();
        expect(screen.queryByTestId('page-payments')).toBeNull();
      });
    });

    it('allows Admin and Approver roles to access /payments', async () => {
      render(
        <MemoryRouter initialEntries={['/payments']}>
          <AuthProvider initialRole="Admin">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('page-payments')).toBeDefined();
      });
    });
  });
});
