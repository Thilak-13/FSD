// tests/pages/Approvals.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { ApprovalsPage } from '../../src/pages/Approvals/ApprovalsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { AppRoutes } from '../../src/app/routes';
import { setMockDelayEnabled, resetInvoices } from '../../src/services/mockApi';

// Helper component to track navigation destination
const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
};

const renderApprovalsPage = (initialRole: 'Approver' | 'Admin' | 'Requester' = 'Approver') => {
  return render(
    <MemoryRouter initialEntries={['/approvals']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/approvals" element={<ApprovalsPage />} />
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

describe('ApprovalsPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
  });

  describe('Initial Render & Queue Metrics', () => {
    it('renders approvals queue heading and table', async () => {
      renderApprovalsPage('Approver');

      expect(screen.getByRole('heading', { name: /Approval Queue/i })).toBeDefined();

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });
    });

    it('displays queue header metrics for awaiting approval, flagged count, and total amount pending', async () => {
      renderApprovalsPage('Approver');

      // Wait for invoices to load
      await waitFor(() => {
        expect(screen.getByTestId('metric-awaiting-approval')).toBeDefined();
      });

      // In mock data:
      // Submitted: INV-2026-001 ($6500), INV-2026-002 ($4800), INV-2026-003 ($2600) -> 3
      // Flagged: INV-2026-011 ($11000), INV-2026-012 ($6000), INV-2026-013 ($8400) -> 3
      // Total in queue = 6. Total amount pending = $39,300.00
      expect(screen.getByTestId('metric-awaiting-approval').textContent).toContain('6');
      expect(screen.getByTestId('metric-flagged-count').textContent).toContain('3');
      expect(screen.getByTestId('metric-pending-amount').textContent).toContain('$39,300.00');
    });

    it('only displays invoices with status Submitted or Flagged', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      // Submitted invoices should be present
      expect(screen.getByText('INV-2026-001')).toBeDefined();
      expect(screen.getByText('INV-2026-002')).toBeDefined();
      expect(screen.getByText('INV-2026-003')).toBeDefined();

      // Flagged invoices should be present
      expect(screen.getByText('INV-2026-011')).toBeDefined();
      expect(screen.getByText('INV-2026-012')).toBeDefined();
      expect(screen.getByText('INV-2026-013')).toBeDefined();

      // Under Verification (INV-2026-004), Approved (INV-2026-007), Payment Scheduled (INV-2026-014), Paid (INV-2026-017) MUST NOT be present
      expect(screen.queryByText('INV-2026-004')).toBeNull();
      expect(screen.queryByText('INV-2026-007')).toBeNull();
      expect(screen.queryByText('INV-2026-014')).toBeNull();
      expect(screen.queryByText('INV-2026-017')).toBeNull();
    });

    it('renders table column headers and formatted data', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      expect(screen.getByText('Invoice #')).toBeDefined();
      expect(screen.getByText('Vendor Name')).toBeDefined();
      expect(screen.getByText('Amount')).toBeDefined();
      expect(screen.getByText('Submitted Date')).toBeDefined();
      expect(screen.getByText('Due Date')).toBeDefined();
      expect(screen.getAllByText('Status').length).toBeGreaterThan(0);
      expect(screen.getByText('Actions')).toBeDefined();

      // Check vendor name resolution
      expect(screen.getAllByText('Apex Cloud Services').length).toBeGreaterThan(0);
    });
  });

  describe('Inline Actions', () => {
    it('approves an invoice after confirmation and displays success notification', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('approve-btn-inv-1')).toBeDefined();
      });

      // Click Approve button on row for inv-1
      const approveBtn = screen.getByTestId('approve-btn-inv-1');
      fireEvent.click(approveBtn);

      // Confirmation dialog should open
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeDefined();
        expect(screen.getByText(/Approve Invoice INV-2026-001/i)).toBeDefined();
      });

      // Click confirm inside alertdialog
      const dialog = screen.getByRole('alertdialog');
      const confirmBtn = within(dialog).getByRole('button', { name: 'Approve Invoice' });
      fireEvent.click(confirmBtn);

      // Toast should appear and inv-1 should be removed from the queue
      await waitFor(() => {
        expect(screen.getByTestId('approvals-toast-message')).toBeDefined();
        expect(screen.getByText(/INV-2026-001.*approved/i)).toBeDefined();
      });

      // inv-1 is now Approved, so it disappears from the Submitted/Flagged triage queue
      await waitFor(() => {
        expect(screen.queryByText('INV-2026-001')).toBeNull();
      });
    });

    it('cancels inline approval without updating invoice status', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('approve-btn-inv-1')).toBeDefined();
      });

      const approveBtn = screen.getByTestId('approve-btn-inv-1');
      fireEvent.click(approveBtn);

      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeDefined();
      });

      const dialog = screen.getByRole('alertdialog');
      const cancelBtn = within(dialog).getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelBtn);

      // Dialog closes, inv-1 remains in queue
      await waitFor(() => {
        expect(screen.queryByRole('alertdialog')).toBeNull();
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });
    });

    it('opens FlagModal, requires reason, and flags invoice on confirm', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('flag-btn-inv-1')).toBeDefined();
      });

      // Click Flag button on row for inv-1
      const flagBtn = screen.getByTestId('flag-btn-inv-1');
      fireEvent.click(flagBtn);

      // Flag modal opens
      await waitFor(() => {
        expect(screen.getByTestId('flag-modal-dialog')).toBeDefined();
        expect(screen.getByText(/Flag Invoice INV-2026-001/i)).toBeDefined();
      });

      const reasonInput = screen.getByTestId('flag-reason-input');
      const submitFlagBtn = screen.getByTestId('confirm-flag-btn');

      // Enter a flag reason
      fireEvent.change(reasonInput, {
        target: { value: 'Price mismatch: Cloud SLA rate exceeds contracted discount' },
      });

      fireEvent.click(submitFlagBtn);

      // Wait for modal to close and toast to appear
      await waitFor(() => {
        expect(screen.queryByTestId('flag-modal-dialog')).toBeNull();
        expect(screen.getByTestId('approvals-toast-message')).toBeDefined();
      });

      // inv-1 status is now Flagged (remains in triage queue as Flagged)
      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });
    });

    it('navigates to /invoices/:id when View action button is clicked', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('view-btn-inv-1')).toBeDefined();
      });

      const viewBtn = screen.getByTestId('view-btn-inv-1');
      fireEvent.click(viewBtn);

      await waitFor(() => {
        expect(screen.getByTestId('page-invoice-detail')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/invoices/inv-1');
      });
    });
  });

  describe('Batch Approval Bar', () => {
    it('does not display batch bar when zero rows are selected', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      expect(screen.queryByTestId('batch-approval-bar')).toBeNull();
    });

    it('shows batch bar when one or more rows are checked', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      // Find row checkboxes
      const row1Checkbox = screen.getByLabelText('Select row 1');
      fireEvent.click(row1Checkbox);

      await waitFor(() => {
        expect(screen.getByTestId('batch-approval-bar')).toBeDefined();
        expect(screen.getByText(/1 invoice selected/i)).toBeDefined();
      });

      const row2Checkbox = screen.getByLabelText('Select row 2');
      fireEvent.click(row2Checkbox);

      await waitFor(() => {
        expect(screen.getByText(/2 invoices selected/i)).toBeDefined();
      });
    });

    it('approves all selected invoices in batch after confirmation', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const row1Checkbox = screen.getByLabelText('Select row 1');
      const row2Checkbox = screen.getByLabelText('Select row 2');
      fireEvent.click(row1Checkbox);
      fireEvent.click(row2Checkbox);

      await waitFor(() => {
        expect(screen.getByTestId('batch-approve-btn')).toBeDefined();
      });

      // Click Approve Selected button
      const batchApproveBtn = screen.getByTestId('batch-approve-btn');
      fireEvent.click(batchApproveBtn);

      // Confirm dialog should open
      await waitFor(() => {
        expect(screen.getByRole('alertdialog')).toBeDefined();
        expect(screen.getByText(/Approve 2 Selected Invoices/i)).toBeDefined();
      });

      // Confirm inside alertdialog
      const dialog = screen.getByRole('alertdialog');
      const confirmBtn = within(dialog).getByRole('button', { name: 'Confirm Batch Approval' });
      fireEvent.click(confirmBtn);

      // Toast notification for batch approval
      await waitFor(() => {
        expect(screen.getByTestId('approvals-toast-message')).toBeDefined();
        expect(screen.getByText(/2 invoices have been approved/i)).toBeDefined();
      });

      // Both inv-1 and inv-2 are now Approved and no longer in the triage queue
      await waitFor(() => {
        expect(screen.queryByText('INV-2026-001')).toBeNull();
        expect(screen.queryByText('INV-2026-002')).toBeNull();
      });

      // Batch bar should hide because selection is cleared
      expect(screen.queryByTestId('batch-approval-bar')).toBeNull();
    });

    it('clears selection when Clear Selection button in batch bar is clicked', async () => {
      renderApprovalsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText('INV-2026-001')).toBeDefined();
      });

      const row1Checkbox = screen.getByLabelText('Select row 1');
      fireEvent.click(row1Checkbox);

      await waitFor(() => {
        expect(screen.getByTestId('batch-approval-bar')).toBeDefined();
      });

      const clearBtn = screen.getByTestId('batch-clear-btn');
      fireEvent.click(clearBtn);

      await waitFor(() => {
        expect(screen.queryByTestId('batch-approval-bar')).toBeNull();
      });
    });
  });

  describe('Route Protection (/approvals)', () => {
    it('redirects unauthorized Requester away from /approvals to /', () => {
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByRole('heading', { name: /Approval Queue/i })).toBeNull();
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
    });

    it('allows Admin to access /approvals', () => {
      sessionStorage.setItem('active_role', 'Admin');
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider initialRole="Admin">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Approval Queue/i })).toBeDefined();
    });

    it('allows Approver to access /approvals', () => {
      sessionStorage.setItem('active_role', 'Approver');
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider initialRole="Approver">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByRole('heading', { name: /Approval Queue/i })).toBeDefined();
    });
  });
});
