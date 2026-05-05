import { test, expect } from '@playwright/test';

test.describe('auth + onboarding hardening', () => {
  test('login route renders stable', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('form')).toBeVisible();
  });

  test('activate route renders stable', async ({ page }) => {
    await page.goto('/activate?token=dummy-token');
    await expect(page.locator('body')).toBeVisible();
    await expect(page.getByRole('heading', { name: /activate your account|activeer je account/i })).toBeVisible();
  });

  test('forgot password route renders stable', async ({ page }) => {
    await page.goto('/forgot-password');
    await expect(page.locator('body')).toBeVisible();
  });
});
