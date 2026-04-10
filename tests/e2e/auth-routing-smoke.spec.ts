import { test, expect } from '@playwright/test';

test.describe('auth + routing smoke', () => {
  test('login page opent stabiel', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: /inloggen/i })).toBeVisible();
  });

  test('beschermde route gaat naar login indien niet ingelogd', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('verkeerde credentials houden gebruiker op login zonder harde crash', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/tenant/i).fill('demo');
    await page.getByLabel(/e-mail/i).fill('admin@demo.com');
    await page.getByLabel(/wachtwoord/i).fill('fout-wachtwoord');
    await page.getByRole('button', { name: /inloggen/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('button', { name: /inloggen/i })).toBeVisible();
    await expect(page.locator('body')).toBeVisible();
  });
});
