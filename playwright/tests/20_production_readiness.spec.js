
const { test, expect } = require('@playwright/test');

test('production readiness smoke', async ({ page }) => {
  await page.goto('/start.html');
  await expect(page).toHaveTitle(/NEN1090|CWS/i);
});

test('superadmin shell renders', async ({ page }) => {
  await page.goto('/layers/superadmin.html');
  await expect(page.locator('body')).toBeVisible();
});
