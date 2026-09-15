import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../../src/context/AuthContext';
import { RouteGuard } from '../../src/components/shared/RouteGuard';
import { setMockDelayEnabled } from '../../src/services/mockApi';

describe('RouteGuard', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
  });

  it('renders children when user has allowed role', () => {
    render(
      <MemoryRouter initialEntries={['/protected']}>
        <AuthProvider>
          {/* Current role defaults to Requester */}
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

  it('redirects to / and sets redirect notice in sessionStorage when role is unauthorized', () => {
    render(
      <MemoryRouter initialEntries={['/admin-only']}>
        <AuthProvider>
          {/* Current role defaults to Requester */}
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
});
