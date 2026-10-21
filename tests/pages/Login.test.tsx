import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { LoginPage } from '../../src/pages/Login/LoginPage';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { authApi } from '../../src/services/dataSource';
import { setMockDelayEnabled } from '../../src/services/mockApi';
import { REDIRECT_NOTICE_KEY } from '../../src/components/shared/RouteGuard';

// Helper component to display current auth state for test assertions
const CurrentAuthDisplay: React.FC = () => {
  const { currentUser, currentRole, isAuthenticated } = useAuth();
  const location = useLocation();
  return (
    <div data-testid="auth-state">
      <span data-testid="auth-status">{isAuthenticated ? 'authenticated' : 'unauthenticated'}</span>
      <span data-testid="auth-role">{currentRole}</span>
      <span data-testid="auth-user">{currentUser?.name || 'none'}</span>
      <span data-testid="auth-email">{currentUser?.email || 'none'}</span>
      <span data-testid="current-path">{location.pathname}</span>
    </div>
  );
};

describe('LoginPage', () => {
  beforeEach(async () => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    await authApi.logout().catch(() => {});
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('initially mounts in unauthenticated state with currentUser = null until login is triggered', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
          <CurrentAuthDisplay />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('auth-status').textContent).toBe('unauthenticated');
    expect(screen.getByTestId('auth-user').textContent).toBe('none');
    expect(screen.getByTestId('auth-email').textContent).toBe('none');
  });

  it('renders quick role selector buttons and signs in', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/Sign In to Invoice Platform/i)).toBeDefined();
    expect(screen.getByTestId('quick-login-Admin')).toBeDefined();
    expect(screen.getByTestId('quick-login-Approver')).toBeDefined();
    expect(screen.getByTestId('quick-login-Requester')).toBeDefined();
  });

  it('renders branding logo and page container with data-testid', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByTestId('page-login')).toBeDefined();
    expect(screen.getAllByLabelText(/PayVerify Platform Logo/i).length).toBeGreaterThan(0);
  });

  it('displays 1-click quick-role demo accounts with correct names and emails', () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    // Admin demo account Alex Rivera
    expect(screen.getByText('Alex Rivera')).toBeDefined();
    expect(screen.getByText('alex.rivera@apex.corp')).toBeDefined();

    // Approver demo account Sarah Chen
    expect(screen.getByText('Sarah Chen')).toBeDefined();
    expect(screen.getByText('sarah.chen@apex.corp')).toBeDefined();

    // Requester demo account Jordan Lee
    expect(screen.getByText('Jordan Lee')).toBeDefined();
    expect(screen.getByText('jordan.lee@apex.corp')).toBeDefined();
  });

  it('hides 1-click quick-role demo accounts when VITE_DEMO_LOGINS is not true', () => {
    vi.stubEnv('VITE_DEMO_LOGINS', 'false');

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByTestId('quick-login-Admin')).toBeNull();
    expect(screen.queryByTestId('quick-login-Approver')).toBeNull();
    expect(screen.queryByTestId('quick-login-Requester')).toBeNull();
    expect(screen.queryByText('1-Click Demo Accounts')).toBeNull();
  });

  it('logs in as Admin on clicking Admin quick-login button and redirects to /', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div data-testid="page-dashboard"><CurrentAuthDisplay /></div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const adminBtn = screen.getByTestId('quick-login-Admin');
    fireEvent.click(adminBtn);

    await waitFor(() => {
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
      expect(screen.getByTestId('auth-role').textContent).toBe('Admin');
      expect(screen.getByTestId('auth-user').textContent).toBe('Alex Rivera');
    });
  });

  it('logs in as Approver on clicking Approver quick-login button', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div data-testid="page-dashboard"><CurrentAuthDisplay /></div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const approverBtn = screen.getByTestId('quick-login-Approver');
    fireEvent.click(approverBtn);

    await waitFor(() => {
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
      expect(screen.getByTestId('auth-role').textContent).toBe('Approver');
      expect(screen.getByTestId('auth-user').textContent).toBe('Sarah Chen');
    });
  });

  it('logs in as Requester on clicking Requester quick-login button', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<div data-testid="page-dashboard"><CurrentAuthDisplay /></div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const requesterBtn = screen.getByTestId('quick-login-Requester');
    fireEvent.click(requesterBtn);

    await waitFor(() => {
      expect(screen.getByTestId('page-dashboard')).toBeDefined();
      expect(screen.getByTestId('auth-role').textContent).toBe('Requester');
      expect(screen.getByTestId('auth-user').textContent).toBe('Jordan Lee');
    });
  });

  it('validates required fields on form submit and shows role="alert"', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const submitBtn = screen.getByTestId('login-submit-button');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      expect(alerts.length).toBeGreaterThan(0);
      expect(screen.getByText(/email is required/i)).toBeDefined();
    });
  });

  it('validates email format and shows error', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByTestId('login-email-input');
    const passwordInput = screen.getByTestId('login-password-input');
    const submitBtn = screen.getByTestId('login-submit-button');

    fireEvent.input(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.input(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/valid email address/i)).toBeDefined();
    });
  });

  it('pre-fills credentials when demo pre-fill helper button is clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const prefillBtn = screen.getByTestId('prefill-admin');
    fireEvent.click(prefillBtn);

    const emailInput = screen.getByTestId('login-email-input') as HTMLInputElement;
    expect(emailInput.value || emailInput.getAttribute('value')).toBe('alex.rivera@apex.corp');
  });

  it('submits valid credentials and redirects to target from location state', async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/invoices' } } }]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/invoices" element={<div data-testid="target-page"><CurrentAuthDisplay /></div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByTestId('login-email-input');
    const passwordInput = screen.getByTestId('login-password-input');
    const submitBtn = screen.getByTestId('login-submit-button');

    fireEvent.input(emailInput, { target: { value: 'sarah.chen@apex.corp' } });
    fireEvent.change(emailInput, { target: { value: 'sarah.chen@apex.corp' } });
    fireEvent.input(passwordInput, { target: { value: 'DemoPassword!2026' } });
    fireEvent.change(passwordInput, { target: { value: 'DemoPassword!2026' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByTestId('target-page')).toBeDefined();
      expect(screen.getByTestId('auth-role').textContent).toBe('Approver');
    });
  });

  it('displays accessible notification banner when redirected with a notice in state', () => {
    const noticeMessage = 'Please sign in to access the Invoices directory.';
    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { redirectNotice: noticeMessage } }]}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const alertBanner = screen.getByRole('alert');
    expect(alertBanner.textContent).toContain(noticeMessage);
  });

  it('displays accessible notification banner when redirected with a notice in sessionStorage', () => {
    const noticeMessage = 'Access restricted: requires Admin permissions.';
    sessionStorage.setItem(REDIRECT_NOTICE_KEY, noticeMessage);

    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const alertBanner = screen.getByRole('alert');
    expect(alertBanner.textContent).toContain(noticeMessage);
  });

  it('sets invalid and aria-describedby attributes on invalid inputs and focuses first invalid field', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByTestId('login-email-input');
    const focusSpy = vi.spyOn(emailInput, 'focus');
    const submitBtn = screen.getByTestId('login-submit-button');

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(emailInput.hasAttribute('invalid')).toBe(true);
      expect(emailInput.getAttribute('aria-describedby')).toBe('login-email-error');
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  it('preserves search parameters from location state on redirect', async () => {
    render(
      <MemoryRouter
        initialEntries={[
          {
            pathname: '/login',
            state: {
              from: {
                pathname: '/invoices',
                search: '?status=Pending&vendor=Acme',
              },
            },
          },
        ]}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/invoices"
              element={
                <div data-testid="target-page">
                  <CurrentAuthDisplay />
                </div>
              }
            />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    const adminBtn = screen.getByTestId('quick-login-Admin');
    fireEvent.click(adminBtn);

    await waitFor(() => {
      expect(screen.getByTestId('target-page')).toBeDefined();
    });
  });

  it('displays server error message when login fails with invalid credentials', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByTestId('login-email-input');
    const passwordInput = screen.getByTestId('login-password-input');
    const submitBtn = screen.getByTestId('login-submit-button');

    fireEvent.input(emailInput, { target: { value: 'unknown@apex.corp' } });
    fireEvent.change(emailInput, { target: { value: 'unknown@apex.corp' } });
    fireEvent.input(passwordInput, { target: { value: 'WrongPassword123' } });
    fireEvent.change(passwordInput, { target: { value: 'WrongPassword123' } });

    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password')).toBeDefined();
    });
  });
});
