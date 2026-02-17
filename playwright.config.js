// Playwright config (Windows-friendly)
const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './playwright/tests',
  timeout: 60_000,
  use: {
    baseURL: 'http://localhost:5173',
    headless: true,
    viewport: { width: 1400, height: 900 },
  },
});