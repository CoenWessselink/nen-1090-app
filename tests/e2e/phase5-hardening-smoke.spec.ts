import { expect, test } from '@playwright/test';

test.describe('phase 5 hardening smoke', () => {
  test('login, reset and activate pages render without hard crash', async ({ page }) => {
    for (const route of ['/login', '/forgot-password', '/reset-password?token=test', '/activate-account?token=test']) {
      await page.goto(route, { waitUntil: 'networkidle' });
      await expect(page.locator('body')).toBeVisible();
      await expect(page.locator('#root, body')).toBeVisible();
    }
  });

  test('public shell tolerates protected redirects without blank page', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/(dashboard|login)(?:$|[?#])/);
  });
});
