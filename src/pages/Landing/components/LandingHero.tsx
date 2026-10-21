// src/pages/Landing/components/LandingHero.tsx
import React from 'react';

export const LandingHero: React.FC = () => {
  return (
    <header className="landing-hero" data-testid="landing-hero">
      <div className="landing-hero-badge">
        <span className="hero-badge-glow" aria-hidden="true" />
        <span className="hero-badge-dot" aria-hidden="true" />
        <span className="hero-badge-pill">Enterprise Verification</span>
        <span className="hero-badge-separator" aria-hidden="true">•</span>
        <span className="hero-badge-text">Next-Gen AP Automation</span>
        <span className="hero-badge-arrow" aria-hidden="true">→</span>
      </div>

      <h1 className="landing-hero-title">
        PayVerify - Intelligent Invoice Verification &amp; Payment Platform
      </h1>

      <p className="landing-hero-lead">
        Accelerate invoice processing and prevent fraudulent disbursements with automated 3-way
        matching, continuous discrepancy detection, and tamper-evident audit logging.
      </p>

      <div className="landing-hero-actions">
        <a href="#signin-section" className="hero-action-btn hero-action-primary">
          <span>Access Verification Portal</span>
          <svg className="hero-action-arrow" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M6 12L10 8L6 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </a>
        <a href="#features-section" className="hero-action-btn hero-action-secondary">
          <span>Platform Highlights</span>
          <svg className="hero-action-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </a>
      </div>

      {/* Value Proposition Highlights */}
      <div className="landing-value-props" data-testid="landing-value-props">
        <div className="value-prop-card" data-testid="value-prop-matching">
          <div className="card-shine-bar" aria-hidden="true" />
          <div className="value-prop-icon-wrap icon-matching" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="value-prop-content">
            <h2 className="value-prop-title">3-Way Matching</h2>
            <p className="value-prop-desc">
              Reconciles Purchase Orders, Goods Received Notes, and Invoices with configurable tolerance thresholds.
            </p>
          </div>
        </div>

        <div className="value-prop-card" data-testid="value-prop-discrepancy">
          <div className="card-shine-bar" aria-hidden="true" />
          <div className="value-prop-icon-wrap icon-discrepancy" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="value-prop-content">
            <h2 className="value-prop-title">Automated Discrepancy Detection</h2>
            <p className="value-prop-desc">
              Instantly flags unit-price shifts, quantity variances, duplicate billings, and unauthorized additions.
            </p>
          </div>
        </div>

        <div className="value-prop-card" data-testid="value-prop-audit">
          <div className="card-shine-bar" aria-hidden="true" />
          <div className="value-prop-icon-wrap icon-audit" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="value-prop-content">
            <h2 className="value-prop-title">Compliance Audit Logs</h2>
            <p className="value-prop-desc">
              Immutable chronological trail recording every review action, approval decision, and payment dispatch.
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
