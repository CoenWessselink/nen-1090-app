import { test, expect } from '@playwright/test';

test.describe('superadmin + billing shell', () => {
  test('billing route resolves', async ({ page }) => {
    await page.goto('/billing');
    await expect(page.locator('body')).toBeVisible();
  });

  test('superadmin route resolves', async ({ page }) => {
    await page.goto('/superadmin');
    await expect(page.locator('body')).toBeVisible();
  });
});
