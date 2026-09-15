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

  it('renders dashboard at / for authenticated default Requester role', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-dashboard')).toBeDefined();
  });

  it('renders invoices directory at /invoices for authenticated user', () => {
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-invoices')).toBeDefined();
  });

  it('redirects unauthenticated user from / to /login', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <LogoutOnMount>
            <AppRoutes />
          </LogoutOnMount>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('page-dashboard')).toBeNull();
    expect(screen.getByTestId('page-login')).toBeDefined();
  });

  it('redirects unauthenticated user from /invoices to /login', () => {
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <AuthProvider>
          <LogoutOnMount>
            <AppRoutes />
          </LogoutOnMount>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('page-invoices')).toBeNull();
    expect(screen.getByTestId('page-login')).toBeDefined();
  });

  it('redirects unauthorized Requester away from /audit-log to /', () => {
    render(
      <MemoryRouter initialEntries={['/audit-log']}>
        <AuthProvider initialRole="Requester">
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('page-audit-log')).toBeNull();
    expect(screen.getByTestId('page-dashboard')).toBeDefined();
  });

  it('allows Admin to access /audit-log', () => {
    sessionStorage.setItem('active_role', 'Admin');
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
