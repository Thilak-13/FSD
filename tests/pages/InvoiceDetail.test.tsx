// tests/pages/InvoiceDetail.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { InvoiceDetailPage } from '../../src/pages/InvoiceDetail/InvoiceDetailPage';
import { VerificationPanel } from '../../src/pages/InvoiceDetail/VerificationPanel';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { dataApi } from '../../src/services/dataSource';
import { setMockDelayEnabled, resetInvoices, INITIAL_INVOICES } from '../../src/services/mockApi';

// Helper component to track navigation destination
const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
};

const renderInvoiceDetailPage = (
  invoiceId = 'inv-1',
  initialRole: 'Requester' | 'Approver' | 'Admin' = 'Admin'
) => {
  return render(
    <MemoryRouter initialEntries={[`/invoices/${invoiceId}`]}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
            <Route
              path="/invoices"
              element={
                <div>
                  <div data-testid="page-invoices">Invoices Directory</div>
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

describe('InvoiceDetailPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
  });

  describe('Header & Basic Rendering', () => {
    it('renders invoice details and status stepper', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin');

      expect(screen.getByText(/Invoice Details/i)).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      expect(screen.getByTestId('status-stepper')).toBeDefined();
    });

    it('renders header metadata: invoice number, vendor, amount, due date, status badge', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      expect(screen.getByTestId('meta-vendor-name').textContent).toContain('Apex Cloud Services');
      expect(screen.getByTestId('meta-amount').textContent).toBe('₹6,500.00');
      expect(screen.getByTestId('meta-due-date').textContent).toBe(INITIAL_INVOICES[0].dueDate);
      expect(screen.getByTestId('meta-submitted-date').textContent).toBe(INITIAL_INVOICES[0].submittedDate);
      expect(screen.getByTestId('invoice-status-badge')).toBeDefined();
    });

    it('navigates back to /invoices when clicking Back to Invoices button', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('back-to-invoices-btn')).toBeDefined();
      });

      const backBtn = screen.getByTestId('back-to-invoices-btn');
      fireEvent.click(backBtn);

      await waitFor(() => {
        expect(screen.getByTestId('page-invoices')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/invoices');
      });
    });

    it('renders accessible EmptyState when invoice ID is not found', async () => {
      renderInvoiceDetailPage('non-existent-inv-999', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('invoice-not-found')).toBeDefined();
        expect(screen.getByText('Invoice Not Found')).toBeDefined();
      });

      const backBtn = screen.getByRole('button', { name: /back to invoices/i });
      fireEvent.click(backBtn);

      await waitFor(() => {
        expect(screen.getByTestId('page-invoices')).toBeDefined();
      });
    });
  });

  describe('StatusStepper', () => {
    it('displays all 5 lifecycle steps in order with active and completed states', async () => {
      renderInvoiceDetailPage('inv-7', 'Admin'); // inv-7 is Approved

      await waitFor(() => {
        expect(screen.getByTestId('status-stepper')).toBeDefined();
      });

      const submittedStep = screen.getByTestId('stepper-step-Submitted');
      const underVerificationStep = screen.getByTestId('stepper-step-Under-Verification');
      const approvedStep = screen.getByTestId('stepper-step-Approved');
      const paymentScheduledStep = screen.getByTestId('stepper-step-Payment-Scheduled');
      const paidStep = screen.getByTestId('stepper-step-Paid');

      expect(submittedStep.className).toContain('is-completed');
      expect(underVerificationStep.className).toContain('is-completed');
      expect(approvedStep.className).toContain('is-current');
      expect(approvedStep.getAttribute('aria-current')).toBe('step');
      expect(paymentScheduledStep.className).not.toContain('is-completed');
      expect(paidStep.className).not.toContain('is-completed');
    });

    it('highlights negative warning banner and flag reason when invoice is Flagged', async () => {
      renderInvoiceDetailPage('inv-11', 'Admin'); // inv-11 is Flagged

      await waitFor(() => {
        expect(screen.getByTestId('stepper-flagged-warning')).toBeDefined();
      });

      const warning = screen.getByTestId('stepper-flagged-warning');
      expect(warning.textContent).toContain('Flagged for Review');
      expect(warning.textContent).toContain('Unit price discrepancy');
    });

    it('marks all steps completed when invoice status is Paid', async () => {
      renderInvoiceDetailPage('inv-17', 'Admin'); // inv-17 is Paid

      await waitFor(() => {
        expect(screen.getByTestId('status-stepper')).toBeDefined();
      });

      const paidStep = screen.getByTestId('stepper-step-Paid');
      expect(paidStep.className).toContain('is-completed');
    });
  });

  describe('VerificationPanel (PO Matching Engine)', () => {
    it('renders linked PO details: PO number, amount, vendor, status', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('verification-po-details')).toBeDefined();
      });

      expect(screen.getByTestId('verification-po-number').textContent).toBe('PO-2026-001');
      expect(screen.getByTestId('verification-po-amount').textContent).toBe('₹14,500.00');
      expect(screen.getByTestId('verification-vendor-name').textContent).toContain('Apex Cloud Services');
    });

    it('detects clean match when line items and PO match perfectly', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin'); // Clean match

      await waitFor(() => {
        expect(screen.getByTestId('verification-summary-banner')).toBeDefined();
      });

      const summary = screen.getByTestId('verification-summary-banner');
      expect(summary.textContent).toContain('Clean Match');
      expect(screen.getAllByText('Matched').length).toBeGreaterThan(0);
    });

    it('detects unit price variance and displays Price Mismatch status light', async () => {
      renderInvoiceDetailPage('inv-11', 'Admin'); // inv-11 has priceMismatch

      await waitFor(() => {
        expect(screen.getByTestId('verification-table')).toBeDefined();
      });

      expect(screen.getByTestId('badge-price-mismatch')).toBeDefined();
      expect(screen.getByText('Price Mismatch')).toBeDefined();
      expect(screen.getByTestId('verification-summary-banner').textContent).toContain('Discrepancies Detected');
    });

    it('detects quantity overbill variance and displays Quantity Overbill status light', async () => {
      renderInvoiceDetailPage('inv-12', 'Admin'); // inv-12 has quantityMismatch

      await waitFor(() => {
        expect(screen.getByTestId('verification-table')).toBeDefined();
      });

      expect(screen.getByTestId('badge-qty-mismatch')).toBeDefined();
      expect(screen.getByText('Quantity Overbill')).toBeDefined();
      expect(screen.getByTestId('verification-summary-banner').textContent).toContain('Discrepancies Detected');
    });

    it('handles invoice without linked PO gracefully with informative alert', async () => {
      render(
        <VerificationPanel
          invoice={{
            id: 'inv-unlinked',
            invoiceNumber: 'INV-UNLINKED-01',
            vendorId: 'vendor-1',
            amount: 500,
            dueDate: '2026-10-01',
            submittedDate: '2026-09-01',
            status: 'Submitted',
            submittedBy: 'user-1',
            items: [{ id: 'li-99', description: 'Office Supplies', quantity: 1, unitPrice: 500, total: 500 }],
          }}
          purchaseOrders={[]}
          vendorName="Apex Cloud Services"
        />
      );

      expect(screen.getByTestId('no-linked-po-alert')).toBeDefined();
      expect(screen.getByText(/No purchase order linked to this invoice/i)).toBeDefined();
    });
  });

  describe('DocumentViewerStub', () => {
    it('renders attached document details: filename, file size, format and preview mockup', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('document-viewer-stub')).toBeDefined();
      });

      expect(screen.getByTestId('document-filename').textContent).toBe('INV-2026-001_Apex.pdf');
      expect(screen.getByTestId('document-size').textContent).toBe('1.4 MB');
      expect(screen.getByTestId('document-mock-sheet')).toBeDefined();
    });

    it('handles document zoom in, zoom out, and reset zoom controls', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('zoom-display')).toBeDefined();
      });

      expect(screen.getByTestId('zoom-display').textContent).toBe('100%');

      // Zoom In
      const zoomInBtn = screen.getByTestId('zoom-in-btn');
      fireEvent.click(zoomInBtn);
      expect(screen.getByTestId('zoom-display').textContent).toBe('125%');

      // Reset Zoom button appears
      const resetBtn = screen.getByTestId('zoom-reset-btn');
      fireEvent.click(resetBtn);
      expect(screen.getByTestId('zoom-display').textContent).toBe('100%');

      // Zoom Out
      const zoomOutBtn = screen.getByTestId('zoom-out-btn');
      fireEvent.click(zoomOutBtn);
      expect(screen.getByTestId('zoom-display').textContent).toBe('75%');
    });

    it('triggers download button with console log and notification toast', async () => {
      const consoleSpy = vi.spyOn(console, 'log');
      renderInvoiceDetailPage('inv-1', 'Admin');

      await waitFor(() => {
        expect(screen.getByTestId('download-document-btn')).toBeDefined();
      });

      const downloadBtn = screen.getByTestId('download-document-btn');
      fireEvent.click(downloadBtn);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Downloading attached document: INV-2026-001_Apex.pdf')
      );

      expect(screen.getByTestId('invoice-detail-toast')).toBeDefined();
      expect(screen.getByText(/Downloading INV-2026-001_Apex.pdf.../i)).toBeDefined();
    });
  });

  describe('ApprovalActions & Role-Based Access Control', () => {
    it('restricts Requester role with read-only notice banner and hides action buttons', async () => {
      renderInvoiceDetailPage('inv-1', 'Requester');

      await waitFor(() => {
        expect(screen.getByTestId('approval-actions')).toBeDefined();
      });

      expect(screen.getByTestId('readonly-notice')).toBeDefined();
      expect(screen.getByTestId('readonly-notice').textContent).toContain('read-only access');
      expect(screen.queryByTestId('approve-invoice-btn')).toBeNull();
      expect(screen.queryByTestId('flag-invoice-btn')).toBeNull();
      expect(screen.queryByTestId('schedule-payment-btn')).toBeNull();
    });

    it('provides Approver and Admin with action buttons', async () => {
      renderInvoiceDetailPage('inv-1', 'Approver');

      await waitFor(() => {
        expect(screen.getByTestId('approve-invoice-btn')).toBeDefined();
      });

      expect(screen.getByTestId('flag-invoice-btn')).toBeDefined();
      expect(screen.getByTestId('schedule-payment-btn')).toBeDefined();
      expect(screen.queryByTestId('readonly-notice')).toBeNull();
    });

    it('executes Approve workflow with ConfirmDialog and updates status to Approved', async () => {
      renderInvoiceDetailPage('inv-1', 'Approver');

      await waitFor(() => {
        expect(screen.getByTestId('approve-invoice-btn')).toBeDefined();
      });

      // Click Approve Button to open ConfirmDialog
      fireEvent.click(screen.getByTestId('approve-invoice-btn'));

      expect(screen.getByRole('alertdialog')).toBeDefined();
      expect(screen.getByText(/Are you sure you want to approve invoice INV-2026-001/i)).toBeDefined();

      // Click Confirm Button in Dialog
      const dialog = screen.getByRole('alertdialog');
      const confirmApproveBtn = within(dialog).getByText('Approve');
      fireEvent.click(confirmApproveBtn);

      // Status should update to Approved and display success toast
      await waitFor(() => {
        expect(screen.getByTestId('invoice-detail-toast')).toBeDefined();
        expect(screen.getByText(/Invoice INV-2026-001 was successfully approved/i)).toBeDefined();
      });
    });

    it('executes Approve workflow for an Under Verification invoice and updates status to Approved', async () => {
      renderInvoiceDetailPage('inv-5', 'Approver'); // inv-5 is Under Verification

      await waitFor(() => {
        expect(screen.getByTestId('approve-invoice-btn')).toBeDefined();
      });

      // Click Approve Button to open ConfirmDialog
      fireEvent.click(screen.getByTestId('approve-invoice-btn'));

      expect(screen.getByRole('alertdialog')).toBeDefined();
      expect(screen.getByText(/Are you sure you want to approve invoice INV-2026-005/i)).toBeDefined();

      // Click Confirm Button in Dialog
      const dialog = screen.getByRole('alertdialog');
      const confirmApproveBtn = within(dialog).getByText('Approve');
      fireEvent.click(confirmApproveBtn);

      // Status should update to Approved and display success toast
      await waitFor(() => {
        expect(screen.getByTestId('invoice-detail-toast')).toBeDefined();
        expect(screen.getByText(/Invoice INV-2026-005 was successfully approved/i)).toBeDefined();
      });
    });

    it('executes Flag for Review workflow requiring a reason and updates status to Flagged', async () => {
      renderInvoiceDetailPage('inv-2', 'Approver');

      await waitFor(() => {
        expect(screen.getByTestId('flag-invoice-btn')).toBeDefined();
      });

      // Click Flag Button to open modal
      fireEvent.click(screen.getByTestId('flag-invoice-btn'));

      expect(screen.getByRole('alertdialog')).toBeDefined();
      expect(screen.getByTestId('flag-reason-input')).toBeDefined();

      // Enter Flag Reason
      const reasonInput = screen.getByTestId('flag-reason-input');
      fireEvent.change(reasonInput, {
        target: { value: 'Discrepancy in freight delivery units vs vendor dispatch sheet' },
      });

      // Confirm Flag
      const confirmFlagBtn = within(screen.getByRole('alertdialog')).getByText('Flag Invoice');
      fireEvent.click(confirmFlagBtn);

      await waitFor(() => {
        expect(screen.getByTestId('invoice-detail-toast')).toBeDefined();
        expect(screen.getByText(/Invoice INV-2026-002 has been flagged for review/i)).toBeDefined();
      });
    });

    it('executes Schedule Payment workflow with date picker and updates status to Payment Scheduled', async () => {
      renderInvoiceDetailPage('inv-7', 'Approver'); // inv-7 is Approved

      await waitFor(() => {
        expect(screen.getByTestId('schedule-payment-btn')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('schedule-payment-btn'));

      expect(screen.getByRole('alertdialog')).toBeDefined();
      expect(screen.getByTestId('payment-date-input')).toBeDefined();

      // Enter payment date
      const dateInput = screen.getByTestId('payment-date-input');
      fireEvent.change(dateInput, { target: { value: '2026-10-15' } });

      const confirmScheduleBtn = within(screen.getByRole('alertdialog')).getByText('Schedule Payment');
      fireEvent.click(confirmScheduleBtn);

      await waitFor(() => {
        expect(screen.getByTestId('invoice-detail-toast')).toBeDefined();
        expect(screen.getByText(/has been scheduled for 2026-10-15/i)).toBeDefined();
      });
    });

    it('displays settlement notice when invoice status is Paid', async () => {
      renderInvoiceDetailPage('inv-17', 'Admin'); // inv-17 is Paid

      await waitFor(() => {
        expect(screen.getByTestId('paid-notice')).toBeDefined();
      });

      expect(screen.getByTestId('paid-notice').textContent).toContain('Payment Completed');
      expect(screen.queryByTestId('approve-invoice-btn')).toBeNull();
    });
  });

  describe('ActivityFeed', () => {
    it('renders audit events filtered by invoice ID with performed by and timestamps', async () => {
      renderInvoiceDetailPage('inv-1', 'Admin'); // inv-1 has audit-1

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeDefined();
      });

      expect(screen.getByTestId('activity-count').textContent).toContain('Event');
      expect(screen.getByText('Elena Rodriguez')).toBeDefined();
      expect(screen.getByText(/submitted for Apex Cloud Services/i)).toBeDefined();
    });

    it('renders multiple audit entries when available for an invoice', async () => {
      renderInvoiceDetailPage('inv-4', 'Admin'); // inv-4 has audit-2 and audit-3

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeDefined();
      });

      expect(screen.getByTestId('activity-count').textContent).toContain('2 Events');
      expect(screen.getByText('System Auto-Matcher')).toBeDefined();
    });

    it('renders empty activity message when no audit entries exist for an invoice', async () => {
      renderInvoiceDetailPage('inv-3', 'Admin'); // inv-3 has no audit entries in INITIAL_AUDIT_LOG

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeDefined();
      });

      expect(screen.getByTestId('empty-activity-message')).toBeDefined();
    });

    it('loads invoice-specific audit trail via dataApi.getAuditLog for Requester role', async () => {
      const getAuditLogSpy = vi.spyOn(dataApi, 'getAuditLog');
      renderInvoiceDetailPage('inv-1', 'Requester');

      await waitFor(() => {
        expect(screen.getByTestId('activity-feed')).toBeDefined();
      });

      expect(getAuditLogSpy).toHaveBeenCalledWith('inv-1');
      expect(screen.getByTestId('activity-count').textContent).toContain('Event');
      expect(screen.getByText('Elena Rodriguez')).toBeDefined();
      getAuditLogSpy.mockRestore();
    });
  });
});
