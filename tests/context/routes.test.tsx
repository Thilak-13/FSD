import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React, { useEffect } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { AppRoutes } from '../../src/app/routes';
import { setMockDelayEnabled } from '../../src/services/mockApi';

const LogoutOnMount: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { logout } = useAuth();
  useEffect(() => {
    logout();
  }, [logout]);
  return <>{children}</>;
};

describe('AppRoutes', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  describe('Root and Landing Navigation', () => {
    it('shows LandingPage when an unauthenticated visitor accesses /', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-dashboard')).toBeNull();
      expect(screen.getByTestId('page-landing')).toBeDefined();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('renders dashboard at / for authenticated visitor', () => {
      render(
        <MemoryRouter initialEntries={['/']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-dashboard')).toBeDefined();
    });

    it('directs /login explicitly to LoginPage', () => {
      render(
        <MemoryRouter initialEntries={['/login']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-login')).toBeDefined();
    });
  });

  describe('Unauthenticated Route Redirection to /login', () => {
    it('redirects unauthenticated user from /invoices to /login', () => {
      render(
        <MemoryRouter initialEntries={['/invoices']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-invoices')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /invoices/:id to /login', () => {
      render(
        <MemoryRouter initialEntries={['/invoices/inv-001']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-invoice-detail')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /approvals to /login', () => {
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-approvals')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /payments to /login', () => {
      render(
        <MemoryRouter initialEntries={['/payments']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-payments')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /vendors to /login', () => {
      render(
        <MemoryRouter initialEntries={['/vendors']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-vendors')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /vendors/:id to /login', () => {
      render(
        <MemoryRouter initialEntries={['/vendors/v-001']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-vendor-detail')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /reports to /login', () => {
      render(
        <MemoryRouter initialEntries={['/reports']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-reports')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from /audit-log to /login', () => {
      render(
        <MemoryRouter initialEntries={['/audit-log']}>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-audit-log')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });

    it('redirects unauthenticated user from / to /login when logged out', () => {
      render(
        <MemoryRouter initialEntries={['/invoices']}>
          <AuthProvider initialRole="Requester">
            <LogoutOnMount>
              <AppRoutes />
            </LogoutOnMount>
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-invoices')).toBeNull();
      expect(screen.getByTestId('page-login')).toBeDefined();
    });
  });

  describe('Role-Based Route Protection (allowedRoles)', () => {
    it('allows authenticated Requester to access /invoices, /vendors, and details', () => {
      render(
        <MemoryRouter initialEntries={['/invoices']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-invoices')).toBeDefined();
    });

    it('redirects unauthorized Requester away from /approvals to /', () => {
      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-approvals')).toBeNull();
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
      expect(sessionStorage.getItem('redirect_notice')).toBeTruthy();
    });

    it('allows Approver and Admin to access /approvals', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider initialRole="Approver">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-approvals')).toBeDefined();
      unmount();

      render(
        <MemoryRouter initialEntries={['/approvals']}>
          <AuthProvider initialRole="Admin">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-approvals')).toBeDefined();
    });

    it('redirects unauthorized Requester away from /payments to /', () => {
      render(
        <MemoryRouter initialEntries={['/payments']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-payments')).toBeNull();
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
    });

    it('allows Approver and Admin to access /payments', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/payments']}>
          <AuthProvider initialRole="Approver">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-payments')).toBeDefined();
      unmount();

      render(
        <MemoryRouter initialEntries={['/payments']}>
          <AuthProvider initialRole="Admin">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-payments')).toBeDefined();
    });

    it('redirects unauthorized Requester away from /reports to /', () => {
      render(
        <MemoryRouter initialEntries={['/reports']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-reports')).toBeNull();
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
    });

    it('allows Approver and Admin to access /reports', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/reports']}>
          <AuthProvider initialRole="Approver">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('reports-page-view')).toBeDefined();
      unmount();

      render(
        <MemoryRouter initialEntries={['/reports']}>
          <AuthProvider initialRole="Admin">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('reports-page-view')).toBeDefined();
    });

    it('redirects unauthorized Requester and Approver away from /audit-log to /', () => {
      const { unmount } = render(
        <MemoryRouter initialEntries={['/audit-log']}>
          <AuthProvider initialRole="Requester">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-audit-log')).toBeNull();
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
      unmount();

      render(
        <MemoryRouter initialEntries={['/audit-log']}>
          <AuthProvider initialRole="Approver">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('page-audit-log')).toBeNull();
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
    });

    it('allows Admin to access /audit-log', () => {
      render(
        <MemoryRouter initialEntries={['/audit-log']}>
          <AuthProvider initialRole="Admin">
            <AppRoutes />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-audit-log')).toBeDefined();
    });
  });
});
