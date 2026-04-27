import { test, expect } from '@playwright/test';

test('phase 5 hardening smoke', async ({ page }) => {
  const routes = [
    '/',
    '/login',
    '/activate?token=dummy-token',
    '/forgot-password'
  ];

  for (const route of routes) {
    await page.goto(route, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('#root')).toBeVisible();
  }
});
