import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  expect: { timeout: 15000 },
  retries: 0,
  reporter: [
    ['json', { outputFile: process.env.PLAYWRIGHT_JSON_OUTPUT_NAME || 'playwright-report.json' }],
    ['line']
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  workers: 1,
});
