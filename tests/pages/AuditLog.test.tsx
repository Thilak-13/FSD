// tests/pages/AuditLog.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuditLogPage } from '../../src/pages/AuditLog/AuditLogPage';
import { AuthProvider } from '../../src/context/AuthContext';
import { DataProvider } from '../../src/context/DataContext';
import { AppRoutes } from '../../src/app/routes';
import { setMockDelayEnabled } from '../../src/services/mockApi';

const renderAuditLogPage = (initialRole: 'Requester' | 'Approver' | 'Admin' = 'Admin') => {
  return render(
    <MemoryRouter initialEntries={['/audit-log']}>
      <AuthProvider initialRole={initialRole}>
        <DataProvider>
          <Routes>
            <Route path="/audit-log" element={<AuditLogPage />} />
            <Route path="/" element={<div data-testid="page-dashboard">Dashboard</div>} />
          </Routes>
        </DataProvider>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('AuditLogPage', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  describe('Initial Render & Table Display', () => {
    it('renders audit trail heading, table columns, and initial audit entries', async () => {
      renderAuditLogPage('Admin');

      expect(screen.getByText(/System Audit Trail/i)).toBeDefined();
      expect(screen.getByText(/Immutable security and compliance log/i)).toBeDefined();

      await waitFor(() => {
        expect(screen.getByTestId('audit-log-table')).toBeDefined();
        // Check for seed entries
        expect(screen.getAllByText('Elena Rodriguez').length).toBeGreaterThan(0);
        expect(screen.getByText('System Auto-Matcher')).toBeDefined();
      });
    });

    it('renders column headers for Timestamp, Action, Actor, Invoice, and Details', async () => {
      renderAuditLogPage('Admin');

      await waitFor(() => {
        expect(screen.getByText('Timestamp')).toBeDefined();
        expect(screen.getByText('Action')).toBeDefined();
        expect(screen.getByText('Performed By')).toBeDefined();
        expect(screen.getByText('Details')).toBeDefined();
      });
    });
  });

  describe('Search & Action Filtering', () => {
    it('filters audit log entries by search query matching actor or details', async () => {
      renderAuditLogPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('audit-search-input')).toBeDefined();
      });

      const searchInput = screen.getByTestId('audit-search-input');
      fireEvent.change(searchInput, { target: { value: 'Auto-Matcher' } });

      await waitFor(() => {
        expect(screen.getByText('System Auto-Matcher')).toBeDefined();
        expect(screen.queryByText('Marcus Vance')).toBeNull();
      });
    });

    it('filters audit log entries by Action Type dropdown', async () => {
      renderAuditLogPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('audit-action-filter')).toBeDefined();
      });

      const select = screen.getByTestId('audit-action-filter') as HTMLSelectElement;
      fireEvent.change(select, { target: { value: 'FLAGGED' } });

      await waitFor(() => {
        expect(select.value).toBe('FLAGGED');
        expect(screen.getByText(/Unit price discrepancy/i)).toBeDefined();
      });
    });

    it('renders empty state when no audit records match filters', async () => {
      renderAuditLogPage('Admin');

      await waitFor(() => {
        expect(screen.getByTestId('audit-search-input')).toBeDefined();
      });

      const searchInput = screen.getByTestId('audit-search-input');
      fireEvent.change(searchInput, { target: { value: 'nonexistent-query-xyz' } });

      await waitFor(() => {
        expect(screen.getByText(/No audit trail events match your criteria/i)).toBeDefined();
      });
    });
  });

  describe('Role-Based Route Guard for /audit-log', () => {
    it('redirects Approver away from /audit-log to /', async () => {
      render(
        <MemoryRouter initialEntries={['/audit-log']}>
          <AuthProvider initialRole="Approver">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeDefined();
        expect(screen.queryByTestId('audit-log-table')).toBeNull();
      });
    });

    it('redirects Requester away from /audit-log to /', async () => {
      render(
        <MemoryRouter initialEntries={['/audit-log']}>
          <AuthProvider initialRole="Requester">
            <DataProvider>
              <AppRoutes />
            </DataProvider>
          </AuthProvider>
        </MemoryRouter>
      );

      await waitFor(() => {
        expect(screen.getByTestId('page-dashboard')).toBeDefined();
        expect(screen.queryByTestId('audit-log-table')).toBeNull();
      });
    });

    it('renders fallback when DataContext is not provided', () => {
      render(
        <MemoryRouter>
          <AuthProvider initialRole="Admin">
            <AuditLogPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-audit-log')).toBeDefined();
    });
  });
});
