const { test, expect } = require('@playwright/test');

const BASE = process.env.APP_BASE_URL || 'http://127.0.0.1:8080';

test('fase f routes laden', async ({ page }) => {
  for (const path of [
    '/layers/dashboard.html',
    '/layers/projecten.html',
    '/layers/lascontrole.html',
    '/layers/ce_dossier.html',
    '/layers/project_detail.html',
    '/layers/instellingen.html'
  ]) {
    const response = await page.goto(`${BASE}${path}`);
    expect(response && response.ok()).toBeTruthy();
    await expect(page.locator('body')).toBeVisible();
  }
});

test('fase f billing route verwijst correct', async ({ page }) => {
  await page.goto(`${BASE}/layers/dashboard.html`);
  const routes = await page.evaluate(() => window.CWS_ROUTES);
  expect(routes.billing).toContain('tenant_billing.html');
});
