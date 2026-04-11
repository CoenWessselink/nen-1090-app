import { test, expect, Page } from '@playwright/test';

const tenant = process.env.TEST_TENANT || 'demo';
const email = process.env.TEST_EMAIL || 'admin@demo.com';
const password = process.env.TEST_PASSWORD || 'Admin123!';
const DEFAULT_PROJECT_ID = '28f5ed98-71b8-4692-83b8-c9df5904489a';

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'networkidle' });
  const tenantField = page.locator('input[name="tenant"], input[placeholder*="tenant" i]').first();
  const emailField = page.locator('input[type="email"], input[name="email"]').first();
  const passwordField = page.locator('input[type="password"]').first();
  const button = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Inloggen")').first();

  if (await tenantField.count()) await tenantField.fill(tenant);
  await emailField.fill(email);
  await passwordField.fill(password);
  await button.click();
  await page.waitForLoadState('networkidle');
}

async function collectUnexpectedNetwork(page: Page) {
  const issues: string[] = [];
  page.on('response', async (response) => {
    const url = response.url();
    const status = response.status();
    if (!url.includes('/api/')) return;
    const allowedAuthRefresh = url.includes('/auth/refresh') && [200, 401, 403].includes(status);
    if (allowedAuthRefresh) return;
    if (status >= 400) issues.push(`${status} ${url}`);
  });
  return issues;
}

test.describe('phase 11 - project tabs consistency', () => {
  for (const route of ['overzicht', 'assemblies', 'lassen', 'documenten', 'ce-dossier', 'historie']) {
    test(`project tab ${route} preserves shared tab shell`, async ({ page }) => {
      await login(page);
      await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/${route}`, { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toContainText(/overzicht/i);
      await expect(page.locator('body')).toContainText(/assemblies/i);
      await expect(page.locator('body')).toContainText(/lassen/i);
      await expect(page.locator('body')).toContainText(/documenten/i);
      await expect(page.locator('body')).toContainText(/ce dossier/i);
      await expect(page.locator('body')).toContainText(/historie/i);
    });
  }
});
