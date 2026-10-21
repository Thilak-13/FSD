import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import {
  LandingPage,
  DEMO_ACCOUNTS,
  PLATFORM_STATS,
  FEATURE_HIGHLIGHTS,
} from '../../src/pages/Landing/LandingPage';
import { AuthProvider, useAuth } from '../../src/context/AuthContext';
import { setMockDelayEnabled } from '../../src/services/mockApi';
import { REDIRECT_NOTICE_KEY } from '../../src/components/shared/RouteGuard';

// Helper component to inspect auth state after landing page sign-in
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

describe('LandingPage (PayVerify Enterprise Authentication Landing)', () => {
  beforeEach(() => {
    setMockDelayEnabled(false);
    sessionStorage.clear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('Pure Sign-In Landing Page Layout (No Marketing Details)', () => {
    it('renders landing page directly as sign in page with branding and login card', () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.getByTestId('page-landing')).toBeDefined();
      expect(screen.getByTestId('page-login')).toBeDefined();
      expect(screen.getByText('Sign In to Invoice Platform')).toBeDefined();
      expect(screen.getByTestId('login-email-input')).toBeDefined();
      expect(screen.getByTestId('login-password-input')).toBeDefined();
      expect(screen.getByTestId('login-submit-button')).toBeDefined();
    });

    it('does not render marketing hero, stats banner, features or extra navigation ("no more details")', () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('landing-hero')).toBeNull();
      expect(screen.queryByTestId('landing-stats-banner')).toBeNull();
      expect(screen.queryByTestId('landing-features-section')).toBeNull();
      expect(screen.queryByLabelText(/Landing Navigation/i)).toBeNull();
      expect(screen.queryByText('3-Way Matching')).toBeNull();
    });

    it('exports PLATFORM_STATS matching enterprise platform benchmarks', () => {
      expect(PLATFORM_STATS).toHaveLength(4);
      expect(PLATFORM_STATS.map((s) => s.value)).toEqual(['32+', '6', '12', '₹250k+']);
    });
  });

  describe('1-Click Persona Sign-In Section', () => {
    it('renders all 3 distinct interactive persona cards with exact descriptions', () => {
      expect(DEMO_ACCOUNTS).toHaveLength(3);
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      // Admin - Alex Rivera
      const adminCard = screen.getByTestId('persona-card-admin');
      expect(adminCard.textContent).toContain('Alex Rivera');
      expect(adminCard.textContent).toContain('alex.rivera@apex.corp');
      expect(adminCard.textContent).toContain(
        'Executive & System Control: Full access to all invoices, vendors, payment scheduling, and immutable audit logs'
      );
      expect(screen.getByTestId('quick-login-Admin')).toBeDefined();

      // Approver - Sarah Chen
      const approverCard = screen.getByTestId('persona-card-approver');
      expect(approverCard.textContent).toContain('Sarah Chen');
      expect(approverCard.textContent).toContain('sarah.chen@apex.corp');
      expect(approverCard.textContent).toContain(
        'Triage & Approval: Verification queue, tolerance review, invoice approvals & flagging, spend analytics'
      );
      expect(screen.getByTestId('quick-login-Approver')).toBeDefined();

      // Requester - Jordan Lee
      const requesterCard = screen.getByTestId('persona-card-requester');
      expect(requesterCard.textContent).toContain('Jordan Lee');
      expect(requesterCard.textContent).toContain('jordan.lee@apex.corp');
      expect(requesterCard.textContent).toContain(
        'Submit & Track: Invoice submission, real-time status tracking, PDF attachment upload'
      );
      expect(screen.getByTestId('quick-login-Requester')).toBeDefined();
    });

    it('signs in as Admin in 1-click and redirects to root dashboard', async () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/" element={<div data-testid="dashboard-view"><CurrentAuthDisplay /></div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      const adminBtn = screen.getByTestId('quick-login-Admin');
      fireEvent.click(adminBtn);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeDefined();
        expect(screen.getByTestId('auth-role').textContent).toBe('Admin');
        expect(screen.getByTestId('auth-user').textContent).toBe('Alex Rivera');
        expect(screen.getByTestId('auth-email').textContent).toBe('alex.rivera@apex.corp');
      });
    });

    it('signs in as Approver in 1-click and preserves destination', async () => {
      render(
        <MemoryRouter
          initialEntries={[{ pathname: '/landing', state: { from: { pathname: '/approvals' } } }]}
        >
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/approvals" element={<div data-testid="approvals-view"><CurrentAuthDisplay /></div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      const approverBtn = screen.getByTestId('quick-login-Approver');
      fireEvent.click(approverBtn);

      await waitFor(() => {
        expect(screen.getByTestId('approvals-view')).toBeDefined();
        expect(screen.getByTestId('auth-role').textContent).toBe('Approver');
        expect(screen.getByTestId('auth-user').textContent).toBe('Sarah Chen');
      });
    });

    it('signs in as Requester in 1-click and preserves search query parameters', async () => {
      render(
        <MemoryRouter
          initialEntries={[
            {
              pathname: '/landing',
              state: {
                from: {
                  pathname: '/invoices',
                  search: '?status=Pending',
                },
              },
            },
          ]}
        >
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/invoices" element={<div data-testid="invoices-view"><CurrentAuthDisplay /></div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      const requesterBtn = screen.getByTestId('quick-login-Requester');
      fireEvent.click(requesterBtn);

      await waitFor(() => {
        expect(screen.getByTestId('invoices-view')).toBeDefined();
        expect(screen.getByTestId('auth-role').textContent).toBe('Requester');
        expect(screen.getByTestId('auth-user').textContent).toBe('Jordan Lee');
      });
    });

    it('hides persona section when VITE_DEMO_LOGINS is false', () => {
      vi.stubEnv('VITE_DEMO_LOGINS', 'false');

      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('quick-login-Admin')).toBeNull();
      expect(screen.queryByTestId('quick-login-Approver')).toBeNull();
      expect(screen.queryByTestId('quick-login-Requester')).toBeNull();
      expect(screen.queryByText('1-Click Demo Accounts')).toBeNull();
    });
  });

  describe('Sign-In Form (Manual Email & Password)', () => {
    it('validates required email and password fields on submit', async () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const submitBtn = screen.getByTestId('login-submit-button');
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Work email is required')).toBeDefined();
        expect(screen.getByText('Password is required')).toBeDefined();
      });
    });

    it('validates invalid email format', async () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByTestId('login-email-input');
      const passwordInput = screen.getByTestId('login-password-input');
      const submitBtn = screen.getByTestId('login-submit-button');

      fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
      fireEvent.change(passwordInput, { target: { value: 'secret' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Please enter a valid email address')).toBeDefined();
      });
    });

    it('pre-fills credentials using pre-fill buttons', () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const prefillAdmin = screen.getByTestId('prefill-admin');
      fireEvent.click(prefillAdmin);

      const emailInput = screen.getByTestId('login-email-input') as HTMLInputElement;
      const passwordInput = screen.getByTestId('login-password-input') as HTMLInputElement;

      expect(emailInput.value).toBe('alex.rivera@apex.corp');
      expect(passwordInput.value).toBe('DemoPassword!2026');

      const prefillApprover = screen.getByTestId('prefill-approver');
      fireEvent.click(prefillApprover);
      expect(emailInput.value).toBe('sarah.chen@apex.corp');

      const prefillRequester = screen.getByTestId('prefill-requester');
      fireEvent.click(prefillRequester);
      expect(emailInput.value).toBe('jordan.lee@apex.corp');
    });

    it('submits manual credentials and logs in successfully', async () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <Routes>
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/" element={<div data-testid="dashboard-view"><CurrentAuthDisplay /></div>} />
            </Routes>
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByTestId('login-email-input');
      const passwordInput = screen.getByTestId('login-password-input');
      const submitBtn = screen.getByTestId('login-submit-button');

      fireEvent.change(emailInput, { target: { value: 'sarah.chen@apex.corp' } });
      fireEvent.change(passwordInput, { target: { value: 'DemoPassword!2026' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByTestId('dashboard-view')).toBeDefined();
        expect(screen.getByTestId('auth-role').textContent).toBe('Approver');
      });
    });

    it('displays error message for invalid credentials', async () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const emailInput = screen.getByTestId('login-email-input');
      const passwordInput = screen.getByTestId('login-password-input');
      const submitBtn = screen.getByTestId('login-submit-button');

      fireEvent.change(emailInput, { target: { value: 'unknown.user@apex.corp' } });
      fireEvent.change(passwordInput, { target: { value: 'WrongPassword999' } });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Invalid email or password')).toBeDefined();
      });
    });

    it('displays and dismisses redirect notice banner', () => {
      const noticeText = 'Session expired. Please sign in again.';
      sessionStorage.setItem(REDIRECT_NOTICE_KEY, noticeText);
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      const banner = screen.getByTestId('login-redirect-banner');
      expect(banner.textContent).toContain(noticeText);

      const dismissBtn = screen.getByLabelText(/Dismiss security notice/i);
      fireEvent.click(dismissBtn);

      expect(screen.queryByTestId('login-redirect-banner')).toBeNull();
    });
  });

  describe('Absence of Marketing Features & Footer ("No More Details")', () => {
    it('does not render marketing feature cards or security footer in the DOM', () => {
      render(
        <MemoryRouter initialEntries={['/landing']}>
          <AuthProvider>
            <LandingPage />
          </AuthProvider>
        </MemoryRouter>
      );

      expect(screen.queryByTestId('landing-features-section')).toBeNull();
      expect(screen.queryByTestId('feature-mern')).toBeNull();
      expect(screen.queryByTestId('feature-3way-matching')).toBeNull();
      expect(screen.queryByTestId('feature-email-alerts')).toBeNull();
      expect(screen.queryByText('SOC2 Type II Certified')).toBeNull();
      expect(screen.queryByText('256-Bit TLS Encryption')).toBeNull();
      expect(screen.queryByText('Immutable Audit Ledger')).toBeNull();
    });

    it('exports FEATURE_HIGHLIGHTS array with expected structure', () => {
      expect(FEATURE_HIGHLIGHTS).toHaveLength(3);
      expect(FEATURE_HIGHLIGHTS.map((f) => f.id)).toEqual(['mern', 'matching', 'alerts']);
      FEATURE_HIGHLIGHTS.forEach((feature) => {
        expect(feature.title).toBeDefined();
        expect(feature.subtitle).toBeDefined();
        expect(feature.description).toBeDefined();
        expect(feature.highlights.length).toBeGreaterThan(0);
      });
    });
  });
});
