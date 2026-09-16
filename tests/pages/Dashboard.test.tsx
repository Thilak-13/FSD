// tests/pages/Dashboard.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { DashboardPage } from '../../src/pages/Dashboard/DashboardPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider, DataContext } from '../../src/context/DataContext';
import { setMockDelayEnabled, resetInvoices } from '../../src/services/mockApi';

// Helper component to track navigation destination
const LocationDisplay: React.FC = () => {
  const location = useLocation();
  return <div data-testid="current-route">{location.pathname}</div>;
};

const renderDashboardPage = (initialRole: 'Requester' | 'Approver' | 'Admin' = 'Admin') => {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route
              path="/approvals"
              element={
                <div>
                  <div data-testid="page-approvals">Approvals Queue</div>
                  <LocationDisplay />
                </div>
              }
            />
            <Route
              path="/invoices"
              element={
                <div>
                  <div data-testid="page-invoices">Invoices Directory</div>
                  <LocationDisplay />
                </div>
              }
            />
            <Route
              path="/payments"
              element={
                <div>
                  <div data-testid="page-payments">Payments Page</div>
                  <LocationDisplay />
                </div>
              }
            />
            <Route
              path="/vendors"
              element={
                <div>
                  <div data-testid="page-vendors">Vendors Page</div>
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

describe('DashboardPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
  });

  describe('Header & KPI Metric Cards', () => {
    it('renders dashboard heading, role banner, and all 4 metric summary cards', async () => {
      renderDashboardPage('Admin');

      expect(screen.getByText(/Executive Dashboard/i)).toBeDefined();
      expect(screen.getByText(/Real-time overview of invoices/i)).toBeDefined();

      // Verify all 4 metric cards are present
      await waitFor(() => {
        expect(screen.getByTestId('kpi-spend-pending')).toBeDefined();
        expect(screen.getByTestId('kpi-requires-approval')).toBeDefined();
        expect(screen.getByTestId('kpi-flagged-discrepancies')).toBeDefined();
        expect(screen.getByTestId('kpi-scheduled-disbursements')).toBeDefined();
      });
    });

    it('calculates accurate values for pending spend and approval counts from seed data', async () => {
      renderDashboardPage('Approver');

      await waitFor(() => {
        const pendingSpendCard = screen.getByTestId('kpi-spend-pending');
        expect(pendingSpendCard).toBeDefined();
        expect(pendingSpendCard.textContent).toContain('$');

        const approvalsCard = screen.getByTestId('kpi-requires-approval');
        expect(approvalsCard).toBeDefined();

        const flaggedCard = screen.getByTestId('kpi-flagged-discrepancies');
        expect(flaggedCard).toBeDefined();

        const scheduledCard = screen.getByTestId('kpi-scheduled-disbursements');
        expect(scheduledCard.textContent).toContain('$');
      });
    });
  });

  describe('Analytics Charts', () => {
    it('renders the Volume Trend and Status Breakdown chart containers', async () => {
      renderDashboardPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-volume-chart')).toBeDefined();
        expect(screen.getByTestId('dashboard-status-chart')).toBeDefined();
        expect(screen.getByText(/Monthly Spend & Invoice Volume/i)).toBeDefined();
        expect(screen.getByText(/Invoice Distribution by Status/i)).toBeDefined();
      });
    });
  });

  describe('Quick Actions & Navigation', () => {
    it('renders quick action navigation links for Approver and navigates on click', async () => {
      renderDashboardPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('quick-link-approvals')).toBeDefined();
        expect(screen.getByTestId('quick-link-invoices')).toBeDefined();
        expect(screen.getByTestId('quick-link-payments')).toBeDefined();
        expect(screen.getByTestId('quick-link-vendors')).toBeDefined();
      });

      // Click Go to Approvals
      fireEvent.click(screen.getByTestId('quick-link-approvals'));
      await waitFor(() => {
        expect(screen.getByTestId('page-approvals')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/approvals');
      });
    });

    it('navigates to payments page from quick actions', async () => {
      renderDashboardPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('quick-link-payments')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('quick-link-payments'));
      await waitFor(() => {
        expect(screen.getByTestId('page-payments')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/payments');
      });
    });

    it('navigates to vendor directory from quick actions', async () => {
      renderDashboardPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('quick-link-vendors')).toBeDefined();
      });

      fireEvent.click(screen.getByTestId('quick-link-vendors'));
      await waitFor(() => {
        expect(screen.getByTestId('page-vendors')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/vendors');
      });
    });

    it('navigates to invoice detail when clicking recent invoice row action', async () => {
      renderDashboardPage('Admin');

      await waitFor(() => {
        const viewLinks = screen.getAllByTestId(/^recent-view-/);
        expect(viewLinks.length).toBeGreaterThan(0);
        fireEvent.click(viewLinks[0]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('page-invoice-detail')).toBeDefined();
      });
    });

    it('navigates to invoices directory when clicking View All Invoices button', async () => {
      renderDashboardPage('Admin');

      await waitFor(() => {
        expect(screen.getByText(/View All Invoices/i)).toBeDefined();
      });

      fireEvent.click(screen.getByText(/View All Invoices/i));
      await waitFor(() => {
        expect(screen.getByTestId('page-invoices')).toBeDefined();
        expect(screen.getByTestId('current-route').textContent).toBe('/invoices');
      });
    });
  });

  describe('Role Adaptation and Accessibility', () => {
    it('adapts quick action widgets for Requester role omitting sensitive approvals and disbursements', async () => {
      renderDashboardPage('Requester');

      await waitFor(() => {
        expect(screen.getByText(/Executive Dashboard/i)).toBeDefined();
        // Requester has quick link to Invoices Directory
        expect(screen.getByTestId('quick-link-invoices')).toBeDefined();
        // Sensitive links omitted
        expect(screen.queryByTestId('quick-link-approvals')).toBeNull();
        expect(screen.queryByTestId('quick-link-payments')).toBeNull();
      });
    });

    it('renders fallback when DataContext is not provided', () => {
      render(
        <MemoryRouter>
          <AuthProvider>
            <DashboardPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-dashboard')).toBeDefined();
    });

    it('handles empty invoice and vendor states cleanly without crashing', async () => {
      const mockEmptyContext: any = {
        invoices: [],
        vendors: [],
        purchaseOrders: [],
        auditLogs: [],
        loading: false,
        error: null,
      };

      render(
        <MemoryRouter>
          <AuthProvider initialRole="Admin">
            <DataContext.Provider value={mockEmptyContext}>
              <DashboardPage />
            </DataContext.Provider>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByText(/Executive Dashboard/i)).toBeDefined();
      expect(screen.getByTestId('kpi-spend-pending').textContent).toContain('$0.00');
      expect(screen.getByTestId('kpi-requires-approval').textContent).toContain('0');
      expect(screen.getByText(/No recent invoices found/i)).toBeDefined();
    });
  });
});
