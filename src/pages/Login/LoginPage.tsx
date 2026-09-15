// src/pages/Login/LoginPage.tsx
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@swc-react/card';
import { Button } from '@swc-react/button';
import { Textfield } from '@swc-react/textfield';
import { Logo } from '../../assets/brand/Logo';
import { FormField } from '../../components/shared/FormField';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import {
  getRedirectNotice,
  clearRedirectNotice,
} from '../../components/shared/RouteGuard';
import { Role } from '../../types';
import './login.css';

export interface DemoAccount {
  role: Role;
  name: string;
  email: string;
  department: string;
  initials: string;
  badgeVariant: 'notice' | 'positive' | 'info';
  description: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    role: 'Admin',
    name: 'Alex Rivera',
    email: 'alex.rivera@apex.corp',
    department: 'Finance Operations',
    initials: 'AR',
    badgeVariant: 'notice',
    description: 'Executive oversight across invoices, triage queues, payments, reports, and audit logs.',
  },
  {
    role: 'Approver',
    name: 'Sarah Chen',
    email: 'sarah.chen@apex.corp',
    department: 'Procurement & Operations',
    initials: 'SC',
    badgeVariant: 'positive',
    description: 'Reviewer workflow access for invoices, payments, and financial analytics.',
  },
  {
    role: 'Requester',
    name: 'Jordan Lee',
    email: 'jordan.lee@apex.corp',
    department: 'Engineering / Facilities',
    initials: 'JL',
    badgeVariant: 'info',
    description: 'Standard access for viewing dashboard, submitting invoices, and tracking vendors.',
  },
];

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const emailRef = React.useRef<any>(null);
  const passwordRef = React.useRef<any>(null);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  // Sync value with custom element DOM properties and attributes
  useEffect(() => {
    if (emailRef.current) {
      emailRef.current.value = email;
      if (typeof emailRef.current.setAttribute === 'function') {
        emailRef.current.setAttribute('value', email);
      }
    }
  }, [email]);

  useEffect(() => {
    if (passwordRef.current) {
      passwordRef.current.value = password;
      if (typeof passwordRef.current.setAttribute === 'function') {
        passwordRef.current.setAttribute('value', password);
      }
    }
  }, [password]);

  // Derive target redirect path
  const locationState = location.state as any;
  const targetPath =
    locationState?.from?.pathname ||
    (typeof locationState?.from === 'string' ? locationState.from : '/') ||
    '/';

  // Read redirect/security notices from router state or sessionStorage
  useEffect(() => {
    const notice =
      locationState?.redirectNotice ||
      locationState?.message ||
      locationState?.notice ||
      getRedirectNotice();

    if (notice) {
      setBannerNotice(notice);
    }
  }, [locationState]);

  const handleDismissBanner = () => {
    setBannerNotice(null);
    clearRedirectNotice();
  };

  const handleQuickLogin = (account: DemoAccount) => {
    login(account.email, account.role);
    clearRedirectNotice();
    navigate(targetPath, { replace: true });
  };

  const handlePrefill = (role: Role) => {
    const account = DEMO_ACCOUNTS.find((a) => a.role === role);
    if (account) {
      setEmail(account.email);
      setPassword('DemoPassword!2026');
      setErrors({});
    }
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    if (errors.email) {
      setErrors((prev) => ({ ...prev, email: undefined }));
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: undefined }));
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { email?: string; password?: string; general?: string } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Determine role from matching demo account or default to Requester
    const demo = DEMO_ACCOUNTS.find(
      (a) => a.email.toLowerCase() === trimmedEmail.toLowerCase()
    );
    const resolvedRole: Role = demo ? demo.role : 'Requester';

    login(trimmedEmail, resolvedRole);
    clearRedirectNotice();
    navigate(targetPath, { replace: true });
  };

  return (
    <main className="login-page-container" data-testid="page-login" role="main">
      <div className="login-card-wrapper">
        <Card heading="Sign In to Invoice Platform" className="login-card">
          <div className="login-card-body">
            {/* Logo and Title Header */}
            <div className="login-header">
              <div className="login-logo-wrapper">
                <Logo size={40} showText={false} />
              </div>
              <h1 className="login-title">Sign In to Invoice Platform</h1>
              <p className="login-subtitle">
                Select a demo role or sign in with your enterprise credentials
              </p>
            </div>

            {/* Redirect / Security Notice Banner */}
            {bannerNotice && (
              <div
                role="alert"
                aria-live="polite"
                className="login-redirect-banner"
                data-testid="login-redirect-banner"
              >
                <div className="login-banner-content">
                  <svg
                    className="login-banner-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span className="login-banner-text">{bannerNotice}</span>
                </div>
                <button
                  type="button"
                  className="login-banner-dismiss"
                  onClick={handleDismissBanner}
                  aria-label="Dismiss security notice"
                >
                  &times;
                </button>
              </div>
            )}

            {/* 1-Click Quick-Role Demo Accounts */}
            <section
              className="quick-role-section"
              aria-label="1-Click Demo Accounts"
            >
              <div className="quick-role-header">
                <h2 className="quick-role-heading">1-Click Demo Accounts</h2>
                <span className="quick-role-hint">Instant role sign-in</span>
              </div>
              <div className="quick-role-list">
                {DEMO_ACCOUNTS.map((account) => (
                  <button
                    type="button"
                    key={account.role}
                    data-testid={`quick-login-${account.role}`}
                    className={`quick-login-btn quick-login-btn-${account.role.toLowerCase()}`}
                    onClick={() => handleQuickLogin(account)}
                    aria-label={`Sign in as ${account.role}: ${account.name}`}
                  >
                    <div className="quick-login-avatar" aria-hidden="true">
                      {account.initials}
                    </div>
                    <div className="quick-login-info">
                      <div className="quick-login-header">
                        <span className="quick-login-name">{account.name}</span>
                        <StatusBadge variant={account.badgeVariant} size="s">
                          {account.role}
                        </StatusBadge>
                      </div>
                      <span className="quick-login-email">{account.email}</span>
                      <span className="quick-login-desc">{account.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* Visual Divider */}
            <div className="login-divider" role="separator" aria-label="Divider">
              <span className="login-divider-text">Or sign in with email</span>
            </div>

            {/* Credentials Form */}
            <form
              onSubmit={handleFormSubmit}
              noValidate
              className="login-form"
              aria-label="Enterprise Login Form"
            >
              {errors.general && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="login-form-error"
                >
                  {errors.general}
                </div>
              )}

              {/* Pre-fill Helper Buttons */}
              <div className="login-prefill-helper">
                <span className="prefill-helper-label">Demo Pre-fill:</span>
                <div className="prefill-buttons">
                  <button
                    type="button"
                    className="prefill-btn"
                    data-testid="prefill-admin"
                    onClick={() => handlePrefill('Admin')}
                    aria-label="Pre-fill Admin demo credentials"
                  >
                    Alex
                  </button>
                  <button
                    type="button"
                    className="prefill-btn"
                    data-testid="prefill-approver"
                    onClick={() => handlePrefill('Approver')}
                    aria-label="Pre-fill Approver demo credentials"
                  >
                    Sarah
                  </button>
                  <button
                    type="button"
                    className="prefill-btn"
                    data-testid="prefill-requester"
                    onClick={() => handlePrefill('Requester')}
                    aria-label="Pre-fill Requester demo credentials"
                  >
                    Jordan
                  </button>
                </div>
              </div>

              {/* Email FormField */}
              <FormField
                label="Work Email"
                htmlFor="login-email"
                error={errors.email}
                required
              >
                <Textfield
                  ref={emailRef}
                  id="login-email"
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  placeholder="name@apex.corp"
                  onInput={(e: any) =>
                    handleEmailChange(
                      e.target?.value !== undefined
                        ? e.target.value
                        : (e.target as any)?.getAttribute?.('value') || ''
                    )
                  }
                  onChange={(e: any) =>
                    handleEmailChange(
                      e.target?.value !== undefined
                        ? e.target.value
                        : (e.target as any)?.getAttribute?.('value') || ''
                    )
                  }
                  className="login-input"
                />
              </FormField>

              {/* Password FormField */}
              <FormField
                label="Password"
                htmlFor="login-password"
                error={errors.password}
                required
              >
                <Textfield
                  ref={passwordRef}
                  id="login-password"
                  data-testid="login-password-input"
                  type="password"
                  value={password}
                  placeholder="••••••••"
                  onInput={(e: any) =>
                    handlePasswordChange(
                      e.target?.value !== undefined
                        ? e.target.value
                        : (e.target as any)?.getAttribute?.('value') || ''
                    )
                  }
                  onChange={(e: any) =>
                    handlePasswordChange(
                      e.target?.value !== undefined
                        ? e.target.value
                        : (e.target as any)?.getAttribute?.('value') || ''
                    )
                  }
                  className="login-input"
                />
              </FormField>

              {/* Submit Button */}
              <Button
                variant="accent"
                type="submit"
                data-testid="login-submit-button"
                className="login-submit-btn"
                onClick={(e: any) => {
                  // In case custom element click doesn't trigger form submit natively in jsdom
                  if (e.target && e.target.closest('form')) {
                    handleFormSubmit(e);
                  }
                }}
              >
                Sign In
              </Button>
            </form>
          </div>
        </Card>
      </div>
    </main>
  );
};
