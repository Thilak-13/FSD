// src/pages/Landing/components/LandingFeatures.tsx
import React from 'react';
import { FEATURE_HIGHLIGHTS, FeatureHighlight } from '../landingData';

export interface LandingFeaturesProps {
  features?: FeatureHighlight[];
}

// Visual category icons for architectural highlight cards
const FeatureIcon: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case 'mern':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feature-header-icon"
          aria-hidden="true"
        >
          <path d="M12 2L2 7l10 5 10-5-10-5z" />
          <path d="M2 17l10 5 10-5" />
          <path d="M2 12l10 5 10-5" />
        </svg>
      );
    case 'matching':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feature-header-icon"
          aria-hidden="true"
        >
          <path d="M9 11l3 3L22 4" />
          <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
        </svg>
      );
    case 'alerts':
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feature-header-icon"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    default:
      return (
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="feature-header-icon"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      );
  }
};

export const LandingFeatures: React.FC<LandingFeaturesProps> = ({ features = FEATURE_HIGHLIGHTS }) => {
  return (
    <section
      id="features-section"
      className="landing-features-section"
      aria-label="Platform Architectural Capabilities"
      data-testid="landing-features-section"
    >
      <div className="features-header">
        <span className="features-tag">Platform Highlights</span>
        <h2 className="features-title">Engineered for Enterprise Financial Accuracy</h2>
        <p className="features-lead">
          Discover how PayVerify unites high-scale MERN cloud architecture with precision matching
          and event-driven automation.
        </p>
      </div>

      <div className="features-grid">
        {features.map((feat) => (
          <div key={feat.id} className="feature-card" data-testid={feat.testId}>
            <div className="feature-card-header">
              <div className={`feature-icon-wrapper feature-icon-${feat.id}`}>
                <FeatureIcon id={feat.id} />
              </div>
              <span className="feature-card-tag">{feat.tag}</span>
            </div>
            <h3 className="feature-card-title">{feat.title}</h3>
            <span className="feature-card-subtitle">{feat.subtitle}</span>
            <p className="feature-card-desc">{feat.description}</p>
            <ul className="feature-highlights-list" aria-label={`${feat.title} Highlights`}>
              {feat.highlights.map((item, idx) => (
                <li key={idx} className="feature-highlight-item">
                  <svg
                    className="feature-check-icon"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
};
