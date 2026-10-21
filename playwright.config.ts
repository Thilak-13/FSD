import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E configuration for PayVerify Real-Mode Readiness.
 * Configured for Chromium-only smoke testing against real backend and frontend servers.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'node backend/scripts/startE2EServer.js',
      port: 5000,
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm run dev',
      port: 5173,
      env: {
        VITE_API_MODE: 'real',
        VITE_DEMO_LOGINS: 'true',
      },
      timeout: 60000,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
