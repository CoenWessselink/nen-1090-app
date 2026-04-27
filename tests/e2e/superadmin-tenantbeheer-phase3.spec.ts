import { test, expect, Page } from '@playwright/test';

const tenant = process.env.TEST_TENANT || 'demo';
const email = process.env.TEST_EMAIL || 'admin@demo.com';
const password = process.env.TEST_PASSWORD || 'Admin123!';

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

test.describe('superadmin phase 3 tenantbeheer', () => {
  test('superadmin route renders and shows tenantbeheer shell', async ({ page }) => {
    await login(page);
    await page.goto('/superadmin', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/superadmin|tenantlijst|tenantbeheer/i);
  });

  test('superadmin detail drawer can be opened when a tenant row exists', async ({ page }) => {
    await login(page);
    await page.goto('/superadmin', { waitUntil: 'networkidle' });
    const detailsButton = page.locator('button:has-text("Details")').first();
    if (await detailsButton.count()) {
      await detailsButton.click();
      await expect(page.locator('body')).toContainText(/samenvatting|gebruikers|audit/i);
    } else {
      await expect(page.locator('body')).toContainText(/geen tenants|tenantlijst/i);
    }
  });
});
