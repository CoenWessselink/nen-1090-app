import { defineConfig, devices, type PlaywrightTestConfig } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'https://nen-1090-app.pages.dev';
const executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH || undefined;
const restrictedBrowser = process.env.PLAYWRIGHT_RESTRICTED_BROWSER === '1';

const desktopProjectUse: PlaywrightTestConfig['use'] = executablePath
  ? {
      browserName: 'chromium',
      ...devices['Desktop Chrome'],
      channel: undefined,
      launchOptions: {
        executablePath,
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
    }
  : {
      ...devices['Desktop Chrome'],
    };

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['json', { outputFile: 'playwright-report/report.json' }],
  ],
  use: {
    baseURL,
    trace: restrictedBrowser ? 'off' : 'on-first-retry',
    screenshot: restrictedBrowser ? 'off' : 'only-on-failure',
    video: restrictedBrowser ? 'off' : 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: desktopProjectUse,
    },
  ],
});
