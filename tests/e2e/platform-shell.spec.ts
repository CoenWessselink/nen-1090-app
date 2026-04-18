import { test, expect } from '@playwright/test';

test.describe('platform shell routes', () => {
  test('dashboard route resolves', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page.locator('body')).toBeVisible();
  });

  test('projecten route resolves', async ({ page }) => {
    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();
  });

  test('instellingen route resolves', async ({ page }) => {
    await page.goto('/instellingen');
    await expect(page.locator('body')).toBeVisible();
  });

  test('rapportage route resolves', async ({ page }) => {
    await page.goto('/rapportage');
    await expect(page.locator('body')).toBeVisible();
  });
});
