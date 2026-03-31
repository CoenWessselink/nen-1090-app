import { defineConfig, devices } from '@playwright/test';

const LIVE_BASE_URL = process.env.PLAYWRIGHT_BASE_URL;
const DEFAULT_LOCAL_BASE_URL = 'http://127.0.0.1:5173';

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'test-results/.last-run.json' }],
  ],
  use: {
    baseURL: LIVE_BASE_URL || DEFAULT_LOCAL_BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    headless: true,
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  webServer: LIVE_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        port: 5173,
        reuseExistingServer: true,
        timeout: 120_000,
      },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH,
        },
      },
    },
  ],
});
