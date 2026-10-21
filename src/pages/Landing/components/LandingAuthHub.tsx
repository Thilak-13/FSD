// src/pages/Landing/components/LandingAuthHub.tsx
import React, { useRef, useEffect } from 'react';
import { Logo } from '../../../assets/brand/Logo';
import { Role } from '../../../types';
import { DEMO_ACCOUNTS, DemoAccount } from '../landingData';

export interface LandingAuthHubProps {
  emailRef?: React.RefObject<HTMLInputElement>;
  passwordRef?: React.RefObject<HTMLInputElement>;
  isDemoLoginsEnabled: boolean;
  demoAccounts?: DemoAccount[];
  loadingRole: Role | null;
  isSubmitting: boolean;
  email: string;
  password: string;
  errors: { email?: string; password?: string; general?: string };
  bannerNotice: string | null;
  onQuickLogin: (account: DemoAccount) => void;
  onPrefill: (role: Role) => void;
  onEmailChange: (val: string) => void;
  onPasswordChange: (val: string) => void;
  onDismissBanner: () => void;
  onSubmit: (e?: React.FormEvent) => void;
}

export const LandingAuthHub: React.FC<LandingAuthHubProps> = ({
  emailRef: externalEmailRef,
  passwordRef: externalPasswordRef,
  isDemoLoginsEnabled,
  demoAccounts = DEMO_ACCOUNTS,
  loadingRole,
  isSubmitting,
  email,
  password,
  errors,
  bannerNotice,
  onQuickLogin,
  onPrefill,
  onEmailChange,
  onPasswordChange,
  onDismissBanner,
  onSubmit,
}) => {
  const internalEmailRef = useRef<HTMLInputElement>(null);
  const internalPasswordRef = useRef<HTMLInputElement>(null);

  const emailRef = externalEmailRef || internalEmailRef;
  const passwordRef = externalPasswordRef || internalPasswordRef;

  useEffect(() => {
    if (emailRef.current) {
      if (errors.email) {
        emailRef.current.setAttribute('invalid', '');
      } else {
        emailRef.current.removeAttribute('invalid');
      }
    }
  }, [errors.email, emailRef]);

  useEffect(() => {
    if (passwordRef.current) {
      if (errors.password) {
        passwordRef.current.setAttribute('invalid', '');
      } else {
        passwordRef.current.removeAttribute('invalid');
      }
    }
  }, [errors.password, passwordRef]);

  return (
    <section
      id="signin-section"
      className="landing-auth-section"
      aria-label="Authentication Hub"
      data-testid="landing-auth-section"
    >
      <div className={`landing-auth-grid ${!isDemoLoginsEnabled ? 'landing-auth-grid-single' : ''}`}>
        {/* 1-Click Persona Sign-In Section */}
        {isDemoLoginsEnabled && (
          <div className="landing-persona-column">
            <section className="quick-role-section" aria-label="1-Click Demo Accounts">
              <div className="quick-role-header">
                <h2 className="quick-role-heading">1-Click Demo Accounts</h2>
                <span className="quick-role-hint">Instant role sign-in</span>
              </div>
              <p className="persona-section-desc">
                Explore role-tailored workflows instantly with pre-configured enterprise test personas:
              </p>
              <div className="quick-role-list persona-cards-list">
                {demoAccounts.map((account) => (
                  <div
                    key={account.role}
                    className={`persona-card persona-card-${account.role.toLowerCase()}`}
                    data-testid={`persona-card-${account.role.toLowerCase()}`}
                  >
                    <div className="persona-card-header">
                      <div
                        className={`persona-avatar persona-avatar-${account.role.toLowerCase()}`}
                        aria-hidden="true"
                      >
                        {account.initials}
                      </div>
                      <div className="persona-meta">
                        <div className="persona-name-row">
                          <span className="persona-name">{account.name}</span>
                          <span className={`quick-login-badge quick-login-badge-${account.badgeVariant}`}>
                            {account.role}
                          </span>
                        </div>
                        <div className="persona-submeta">
                          <span className="persona-email">{account.email}</span>
                          <span className="persona-dept-dot" aria-hidden="true">&bull;</span>
                          <span className="persona-dept">{account.department}</span>
                        </div>
                      </div>
                    </div>

                    <p className="persona-desc">{account.description}</p>

                    <button
                      type="button"
                      data-testid={`quick-login-${account.role}`}
                      className={`quick-login-btn quick-login-btn-${account.role.toLowerCase()}`}
                      onClick={() => onQuickLogin(account)}
                      disabled={loadingRole === account.role || isSubmitting}
                      aria-label={`Sign in as ${account.role}: ${account.name}`}
                    >
                      {loadingRole === account.role ? (
                        <>
                          <span className="login-spinner" aria-hidden="true" />
                          <span>Signing in...</span>
                        </>
                      ) : (
                        <>
                          <span>1-Click Sign In</span>
                          <svg className="quick-login-arrow" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path
                              fillRule="evenodd"
                              d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Credentials Sign-In Card */}
        <div className="landing-form-column">
          <div className="login-card-wrapper" style={{ width: '100%', maxWidth: '100%' }}>
            <div className="login-card">
              <div className="login-card-body">
                {/* Header */}
                <div className="login-header">
                  <div className="login-logo-wrapper">
                    <Logo size={36} showText={false} />
                  </div>
                  <h2 className="login-title">Sign In to Invoice Platform</h2>
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
                      onClick={onDismissBanner}
                      aria-label="Dismiss security notice"
                    >
                      &times;
                    </button>
                  </div>
                )}

                {/* Credentials Form */}
                <form
                  onSubmit={onSubmit}
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
                    <div className="prefill-helper-title-wrap">
                      <svg
                        className="prefill-helper-icon"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="prefill-helper-label">Demo Pre-fill:</span>
                    </div>
                    <div className="prefill-buttons">
                      <button
                        type="button"
                        className="prefill-btn"
                        data-testid="prefill-admin"
                        onClick={() => onPrefill('Admin')}
                        aria-label="Pre-fill Admin demo credentials"
                      >
                        Alex
                      </button>
                      <button
                        type="button"
                        className="prefill-btn"
                        data-testid="prefill-approver"
                        onClick={() => onPrefill('Approver')}
                        aria-label="Pre-fill Approver demo credentials"
                      >
                        Sarah
                      </button>
                      <button
                        type="button"
                        className="prefill-btn"
                        data-testid="prefill-requester"
                        onClick={() => onPrefill('Requester')}
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
                        onEmailChange((e.target as HTMLInputElement).value)
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onEmailChange(e.target.value)
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
                        onPasswordChange((e.target as HTMLInputElement).value)
                      }
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        onPasswordChange(e.target.value)
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
          </div>
        </div>
      </div>
    </section>
  );
};
