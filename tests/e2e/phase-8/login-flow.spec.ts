import { test, expect } from '@playwright/test';

const tenant = process.env.TEST_TENANT || 'demo';
const email = process.env.TEST_EMAIL || 'admin@demo.com';
const password = process.env.TEST_PASSWORD || 'Admin123!';

test.describe('phase 8 - login flow', () => {
  test('can submit login form', async ({ page }) => {
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
    await expect(page).not.toHaveURL(/\/login(?:$|[?#])/);
  });
});
