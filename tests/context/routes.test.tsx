import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { AppRoutes } from '../../src/app/routes';
import { setMockDelayEnabled } from '../../src/services/mockApi';

describe('AppRoutes', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  it('renders public dashboard at / for default Requester role', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-dashboard')).toBeDefined();
  });

  it('renders invoices directory at /invoices', () => {
    render(
      <MemoryRouter initialEntries={['/invoices']}>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-invoices')).toBeDefined();
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
