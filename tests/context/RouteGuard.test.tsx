import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { RouteGuard } from '../../src/components/shared/RouteGuard';
import { setMockDelayEnabled } from '../../src/services/mockApi';

const LocationStateDisplay: React.FC = () => {
  const location = useLocation();
  return (
    <div>
      <div data-testid="login-page">Login Page</div>
      <div data-testid="redirect-from">{location.state?.from?.pathname || 'none'}</div>
    </div>
  );
};

describe('RouteGuard', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  it('renders children when user has allowed role', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider initialRole="Requester">
          <Routes>
            <Route path="/" element={<div>Dashboard Page</div>} />
            <Route
              path="/protected"
              element={
                <RouteGuard allowedRoles={['Requester']}>
                  <div>Protected Content</div>
                </RouteGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('Protected Content')).toBeDefined();
  });

  it('renders children for any authenticated user when allowedRoles is omitted', () => {
    render(
      <MemoryRouter initialEntries={['/general']}>
        <AuthProvider initialRole="Requester">
          <Routes>
            <Route path="/" element={<div>Dashboard Page</div>} />
            <Route
              path="/general"
              element={
                <RouteGuard>
                  <div>General Authenticated Content</div>
                </RouteGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText('General Authenticated Content')).toBeDefined();
  });

  it('redirects to / and sets redirect notice in sessionStorage when role is unauthorized', () => {
    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <AuthProvider initialRole="Requester">
          <Routes>
            <Route path="/" element={<div>Dashboard Page</div>} />
            <Route
              path="/admin-only"
              element={
                <RouteGuard allowedRoles={['Admin']}>
                  <div>Admin Secret Area</div>
                </RouteGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText('Admin Secret Area')).toBeNull();
    expect(screen.getByText('Dashboard Page')).toBeDefined();
    expect(sessionStorage.getItem('redirect_notice')).toBeTruthy();
  });

  it('redirects unauthenticated users to /login and preserves location in state', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LocationStateDisplay />} />
            <Route
              path="/protected"
              element={
                <RouteGuard allowedRoles={['Requester']}>
                  <div>Protected Secret</div>
                </RouteGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText('Protected Secret')).toBeNull();
    expect(screen.getByTestId('login-page')).toBeDefined();
    expect(screen.getByTestId('redirect-from').textContent).toBe('/protected');
  });

  it('sets custom unauthorized message when provided', () => {
    const customMessage = 'Only administrators may access the audit log.';
    render(
      <MemoryRouter initialEntries={['/audit-area']}>
        <AuthProvider initialRole="Approver">
          <Routes>
            <Route path="/" element={<div>Dashboard Page</div>} />
            <Route
              path="/audit-area"
              element={
                <RouteGuard allowedRoles={['Admin']} unauthorizedMessage={customMessage}>
                  <div>Audit Area</div>
                </RouteGuard>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText('Audit Area')).toBeNull();
    expect(screen.getByText('Dashboard Page')).toBeDefined();
    expect(sessionStorage.getItem('redirect_notice')).toBe(customMessage);
  });
});
