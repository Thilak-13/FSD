// src/pages/Landing/components/LandingNav.tsx
import React from 'react';

export const LandingNav: React.FC = () => {
  return (
    <nav className="landing-top-nav" aria-label="Landing Navigation">
      <div className="landing-nav-inner">
        <div className="landing-nav-brand">
          <div className="brand-logo" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <svg
              width={32}
              height={32}
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              role="presentation"
            >
              <rect width="32" height="32" rx="6" fill="#0d66d0" />
              <path
                d="M8.5 7.5C8.5 6.94772 8.94772 6.5 9.5 6.5H19L23.5 11V24.5C23.5 25.0523 23.0523 25.5 22.5 25.5H9.5C8.94772 25.5 8.5 25.0523 8.5 24.5V7.5Z"
                fill="white"
                fillOpacity="0.15"
                stroke="white"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
              <path d="M18.5 6.5V11.5H23.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="11.5" y1="14" x2="17.5" y2="14" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="11.5" y1="17.5" x2="15.5" y2="17.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="20.5" cy="20.5" r="4.5" fill="#10b981" stroke="white" strokeWidth="1.5" />
              <path d="M18.5 20.5L20 22L22.5 19.5" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span style={{ fontWeight: 700, fontSize: '16px', color: '#0f172a', letterSpacing: '-0.01em' }}>
              PayVerify
            </span>
          </div>
          <span className="landing-nav-tag">Enterprise AP</span>
        </div>
        <div className="landing-nav-actions">
          <div className="platform-live-indicator" role="status" aria-label="Platform Status: Operational">
            <span className="live-dot" aria-hidden="true" />
            <span>Platform Online</span>
          </div>
          <a href="#signin-section" className="landing-nav-cta">
            Sign In
          </a>
        </div>
      </div>
    </nav>
  );
};
