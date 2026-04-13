import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: 1,
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'https://nen-1090-app.pages.dev',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
