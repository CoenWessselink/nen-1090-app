import { test, expect } from '@playwright/test';

test.describe('superadmin + billing lifecycle shell', () => {
  test('superadmin shell opens', async ({ page }) => {
    await page.goto('/superadmin');
    await expect(page.locator('body')).toBeVisible();
  });

  test('billing shell opens', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('tenant lifecycle screens do not crash', async ({ page }) => {
    await page.goto('/superadmin');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('text=Superadmin')).toBeVisible();
  });
});
