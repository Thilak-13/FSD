// src/pages/Landing/components/LandingStats.tsx
import React from 'react';
import { PLATFORM_STATS, PlatformStat } from '../landingData';

export interface LandingStatsProps {
  stats?: PlatformStat[];
}

export const LandingStats: React.FC<LandingStatsProps> = ({ stats = PLATFORM_STATS }) => {
  return (
    <section
      className="landing-stats-banner"
      aria-label="Platform Live Statistics"
      data-testid="landing-stats-banner"
    >
      <div className="stats-grid">
        {stats.map((stat) => (
          <div key={stat.id} className="stat-item" data-testid={stat.testId}>
            <div className="stat-item-top">
              <span className="stat-value stat-value-accent">{stat.value}</span>
              <span className="stat-indicator-dot" aria-hidden="true" />
            </div>
            <span className="stat-label">{stat.label}</span>
            <span className="stat-subtext">{stat.subtext}</span>
          </div>
        ))}
      </div>
    </section>
  );
};
