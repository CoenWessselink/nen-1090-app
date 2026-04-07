import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45000,
  expect: { timeout: 10000 },
  retries: 0,
  workers: 1,
  reporter: [['list']],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173',
    browserName: 'chromium',
    channel: undefined,
    launchOptions: {
      executablePath: '/usr/bin/chromium',
    },
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});
