// tests/pages/Reports.test.tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ReportsPage } from '../../src/pages/Reports/ReportsPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { AppRoutes } from '../../src/app/routes';
import { setMockDelayEnabled, resetInvoices, resetVendors } from '../../src/services/mockApi';

const renderReportsPage = (initialRole: 'Requester' | 'Approver' | 'Admin' = 'Admin') => {
  return render(
    <MemoryRouter initialEntries={['/reports']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/reports" element={<ReportsPage />} />
            <Route path="/" element={<div data-testid="page-dashboard">Dashboard</div>} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('ReportsPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    resetInvoices();
    resetVendors();
    vi.restoreAllMocks();
  });

  describe('Initial Render & Summary Metrics', () => {
    it('renders reports heading, date filter, and summary metrics cards', async () => {
      renderReportsPage('Admin');

      expect(screen.getByText(/Financial Reports/i)).toBeDefined();
      expect(screen.getByText(/Comprehensive spend analysis/i)).toBeDefined();

      await waitFor(() => {
        expect(screen.getByTestId('report-metric-total-billed')).toBeDefined();
        expect(screen.getByTestId('report-metric-total-paid')).toBeDefined();
        expect(screen.getByTestId('report-metric-pending')).toBeDefined();
      });
    });

    it('renders vendor breakdown table with aggregated calculations', async () => {
      renderReportsPage('Approver');

      await waitFor(() => {
        expect(screen.getByText(/Vendor Spend Breakdown/i)).toBeDefined();
        expect(screen.getByTestId('vendor-breakdown-table')).toBeDefined();
        // Check for known vendor names from seed data
        expect(screen.getByText('Apex Cloud Services')).toBeDefined();
        expect(screen.getByText('Northwest Logistics')).toBeDefined();
      });
    });
  });

  describe('Date Range Filtering', () => {
    it('allows changing date range filter selection', async () => {
      renderReportsPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('date-range-filter-select')).toBeDefined();
      });

      const select = screen.getByTestId('date-range-filter-select') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: '30d' } });

      await waitFor(() => {
        expect(select.value).toBe('30d');
      });
    });
  });

  describe('CSV & PDF Export Controls', () => {
    it('triggers CSV generation and download on button click', async () => {
      renderReportsPage('Admin');

      // Mock URL.createObjectURL and URL.revokeObjectURL
      const mockCreateObjectURL = vi.fn().mockReturnValue('blob:test-csv');
      const mockRevokeObjectURL = vi.fn();
      window.URL.createObjectURL = mockCreateObjectURL;
      window.URL.revokeObjectURL = mockRevokeObjectURL;

      await waitFor(() => {
        expect(screen.getByTestId('export-csv-btn')).toBeDefined();
      });

      const csvBtn = screen.getByTestId('export-csv-btn');
      fireEvent.click(csvBtn);

      await waitFor(() => {
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(screen.getByText(/CSV export downloaded successfully/i)).toBeDefined();
      });
    });

    it('triggers stubbed PDF export with console log and notification toast', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      renderReportsPage('Approver');

      await waitFor(() => {
        expect(screen.getByTestId('export-pdf-btn')).toBeDefined();
      });

      const pdfBtn = screen.getByTestId('export-pdf-btn');
      fireEvent.click(pdfBtn);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          expect.stringContaining('[PDF Export Stub]')
        );
        expect(screen.getByText(/PDF report generation initiated/i)).toBeDefined();
      });
    });
  });

  describe('Role-Based Route Guard for /reports', () => {
    it('bounces Requester away from /reports to /', async () => {
      render(
        <MemoryRouter initialEntries={['/reports']}>
          <AuthProvider initialRole="Requester">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeDefined();
        expect(screen.queryByTestId('vendor-breakdown-table')).toBeNull();
      });
    });

    it('renders fallback when DataContext is not provided', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Admin">
            <ReportsPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-reports')).toBeDefined();
    });
  });
});
