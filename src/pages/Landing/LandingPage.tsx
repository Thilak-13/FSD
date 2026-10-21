/// <reference types="vite/client" />
// src/pages/Landing/LandingPage.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  getRedirectNotice,
  clearRedirectNotice,
} from '../../components/shared/RouteGuard';
import { Logo } from '../../assets/brand/Logo';
import { Role } from '../../types';
import {
  DEMO_ACCOUNTS,
  PLATFORM_STATS,
  FEATURE_HIGHLIGHTS,
  DemoAccount,
  PlatformStat,
  FeatureHighlight,
} from './landingData';
import '../Login/login.css';

export {
  DEMO_ACCOUNTS,
  PLATFORM_STATS,
  FEATURE_HIGHLIGHTS,
};
export type {
  DemoAccount,
  PlatformStat,
  FeatureHighlight,
};

export interface LandingPageProps {
  isLoginPage?: boolean;
}

export const LandingPage: React.FC<LandingPageProps> = () => {
  const { login } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingRole, setLoadingRole] = useState<Role | null>(null);

  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [bannerNotice, setBannerNotice] = useState<string | null>(null);

  const isDemoLoginsEnabled = import.meta.env.VITE_DEMO_LOGINS === 'true';

  // Derive target redirect path
  const locationState = location.state as any;
  const targetPath = useMemo(() => {
    if (!locationState?.from) return '/';
    if (typeof locationState.from === 'string') return locationState.from;
    if (locationState.from.pathname) {
      return `${locationState.from.pathname}${locationState.from.search || ''}`;
    }
    return '/';
  }, [locationState]);

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

  const handleQuickLogin = async (account: DemoAccount) => {
    try {
      setLoadingRole(account.role);
      setErrors({});
      await login(account.email, 'DemoPassword!2026');
      clearRedirectNotice();
      const dest = !targetPath || targetPath === '/login' || targetPath === '/landing' ? '/' : targetPath;
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setErrors({ general: message });
    } finally {
      setLoadingRole(null);
    }
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

  useEffect(() => {
    if (emailRef.current) {
      if (errors.email) {
        emailRef.current.setAttribute('invalid', '');
      } else {
        emailRef.current.removeAttribute('invalid');
      }
    }
  }, [errors.email]);

  useEffect(() => {
    if (passwordRef.current) {
      if (errors.password) {
        passwordRef.current.setAttribute('invalid', '');
      } else {
        passwordRef.current.removeAttribute('invalid');
      }
    }
  }, [errors.password]);

  const handleFormSubmit = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
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
      if (newErrors.email) {
        emailRef.current?.focus?.();
      } else if (newErrors.password) {
        passwordRef.current?.focus?.();
      }
      return;
    }

    try {
      setIsSubmitting(true);
      setErrors({});
      await login(trimmedEmail, password);
      clearRedirectNotice();
      const dest = !targetPath || targetPath === '/login' || targetPath === '/landing' ? '/' : targetPath;
      navigate(dest, { replace: true });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid email or password';
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="login-page-container" data-testid="page-landing">
      <a href="#page-login" className="skip-link">
        Skip to main content
      </a>
      <main
        id="page-login"
        className="login-card-wrapper"
        data-testid="page-login"
        role="main"
      >
        <div className="login-card">
          <div className="login-card-body">
            {/* Header & Logo */}
            <div className="login-header">
              <div className="login-logo-wrapper">
                <Logo size={36} showText={true} />
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
                  <svg className="login-banner-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
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

            {/* 1-Click Demo Accounts */}
            {isDemoLoginsEnabled && (
              <section className="quick-role-section" aria-label="1-Click Demo Accounts">
                <div className="quick-role-header">
                  <h2 className="quick-role-heading">1-Click Demo Accounts</h2>
                  <span className="quick-role-hint">Instant role sign-in</span>
                </div>
                <div className="quick-role-list">
                  {DEMO_ACCOUNTS.map((account) => (
                    <div
                      key={account.role}
                      data-testid={`persona-card-${account.role.toLowerCase()}`}
                    >
                      <button
                        type="button"
                        data-testid={`quick-login-${account.role}`}
                        className={`quick-login-btn quick-login-btn-${account.role.toLowerCase()}`}
                        onClick={() => handleQuickLogin(account)}
                        disabled={loadingRole === account.role || isSubmitting}
                        aria-label={`Sign in as ${account.role}: ${account.name}`}
                      >
                        <div
                          className={`quick-login-avatar quick-login-avatar-${account.role.toLowerCase()}`}
                          aria-hidden="true"
                        >
                          {account.initials}
                        </div>
                        <div className="quick-login-info">
                          <div className="quick-login-header">
                            <span className="quick-login-name">{account.name}</span>
                            <span className={`quick-login-badge quick-login-badge-${account.badgeVariant}`}>
                              {account.role}
                            </span>
                          </div>
                          <span className="quick-login-email">{account.email}</span>
                          <span className="quick-login-desc">{account.description}</span>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Divider */}
            {isDemoLoginsEnabled && (
              <div className="login-divider">
                <span className="login-divider-text">Or continue with credentials</span>
              </div>
            )}

            {/* Credentials Form */}
            <form
              onSubmit={handleFormSubmit}
              noValidate
              className="login-form"
              aria-label="Enterprise Login Form"
            >
              {errors.general && (
                <div role="alert" aria-live="polite" className="login-form-error">
                  <svg className="login-error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{errors.general}</span>
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

              {/* Email Form Field */}
              <div className="login-field-group">
                <label htmlFor="login-email" className="login-field-label">
                  Work Email <span className="login-field-required" aria-hidden="true">*</span>
                </label>
                <input
                  ref={emailRef}
                  id="login-email"
                  name="email"
                  data-testid="login-email-input"
                  type="email"
                  value={email}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? 'login-email-error' : undefined}
                  placeholder="name@apex.corp"
                  autoComplete="email"
                  {...(errors.email ? { invalid: '' } : {})}
                  onInput={(e: React.FormEvent<HTMLInputElement>) =>
                    handleEmailChange((e.target as HTMLInputElement).value)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handleEmailChange(e.target.value)
                  }
                  className={`login-input ${errors.email ? 'login-input-invalid' : ''}`}
                />
                {errors.email && (
                  <div id="login-email-error" role="alert" aria-live="polite" className="login-field-error">
                    <svg className="login-error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{errors.email}</span>
                  </div>
                )}
              </div>

              {/* Password Form Field */}
              <div className="login-field-group">
                <label htmlFor="login-password" className="login-field-label">
                  Password <span className="login-field-required" aria-hidden="true">*</span>
                </label>
                <input
                  ref={passwordRef}
                  id="login-password"
                  name="password"
                  data-testid="login-password-input"
                  type="password"
                  value={password}
                  disabled={isSubmitting}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  {...(errors.password ? { invalid: '' } : {})}
                  onInput={(e: React.FormEvent<HTMLInputElement>) =>
                    handlePasswordChange((e.target as HTMLInputElement).value)
                  }
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    handlePasswordChange(e.target.value)
                  }
                  className={`login-input ${errors.password ? 'login-input-invalid' : ''}`}
                />
                {errors.password && (
                  <div id="login-password-error" role="alert" aria-live="polite" className="login-field-error">
                    <svg className="login-error-icon" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span>{errors.password}</span>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                data-testid="login-submit-button"
                className="login-submit-btn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span
                      className="login-spinner"
                      data-testid="login-loading-indicator"
                      aria-hidden="true"
                    />
                    <span>Signing in...</span>
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default LandingPage;
