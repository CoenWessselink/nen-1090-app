import { test, expect } from '@playwright/test';
import { DEFAULT_PROJECT_ID, expectAppShell, expectNotOnLogin, login } from './_phase11-auth-helper';

test.describe('phase 11 - auth session lifecycle', () => {
  test('unauthenticated protected routes redirect to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login(?:$|[?#])/);
    await expect(page.locator('body')).toContainText(/login|inloggen|email|wachtwoord/i);
  });

  test('live login works and opens shell', async ({ page }) => {
    await login(page);
    await expectAppShell(page);
  });

  test('refresh on protected route keeps shell alive', async ({ page }) => {
    await login(page);
    await page.goto('/projecten', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });
    await expectNotOnLogin(page);
    await expect(page.locator('body')).toContainText(/projecten|zoek|nieuw/i);
  });

  test('deep link after login stays inside app shell', async ({ page }) => {
    await login(page);
    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/overzicht`, { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);
  });
});
