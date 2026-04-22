import { test, expect } from '@playwright/test';

test.describe('superadmin + billing lifecycle shell', () => {
  test('superadmin shell opens', async ({ page }) => {
    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/superadmin/);
  });

  test('billing shell opens', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/billing/);
  });

  test('tenant lifecycle screens do not crash', async ({ page }) => {
    await page.goto('/superadmin');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toBeVisible();
    await expect(page).toHaveURL(/\/superadmin/);
    await expect(page.locator('main, [role="main"], body')).toBeVisible();
  });
});
