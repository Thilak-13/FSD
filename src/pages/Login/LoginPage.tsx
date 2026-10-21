/// <reference types="vite/client" />
// src/pages/Login/LoginPage.tsx
import React from 'react';
import {
  LandingPage,
  DEMO_ACCOUNTS,
  DemoAccount,
  PLATFORM_STATS,
  FEATURE_HIGHLIGHTS,
} from '../Landing/LandingPage';

export { DEMO_ACCOUNTS, PLATFORM_STATS, FEATURE_HIGHLIGHTS };
export type { DemoAccount };

export const LoginPage: React.FC = () => {
  return <LandingPage isLoginPage />;
};

export default LoginPage;
