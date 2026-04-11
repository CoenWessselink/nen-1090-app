import { test, expect } from '@playwright/test';

test.describe('auth + routing smoke', () => {
  test('login page opent stabiel', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/login|inloggen|email|wachtwoord/i);
  });

  test('beschermde route gaat naar login indien niet ingelogd', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login(?:$|[?#])/);
    await expect(page.locator('body')).toBeVisible();
  });

  test('verkeerde credentials houden gebruiker op login zonder harde crash', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });

    const tenantField = page.locator('input[name="tenant"], input[placeholder*="tenant" i]').first();
    const emailField = page.locator('input[type="email"], input[name="email"]').first();
    const passwordField = page.locator('input[type="password"]').first();
    const submitButton = page.locator('button[type="submit"], button:has-text("Login"), button:has-text("Inloggen")').first();

    if (await tenantField.count()) await tenantField.fill('demo');
    await emailField.fill('wrong@example.com');
    await passwordField.fill('WrongPassword123!');
    await submitButton.click();

    await page.waitForLoadState('networkidle');
    await expect(page).toHaveURL(/\/login(?:$|[?#])/);
    await expect(page.locator('body')).toBeVisible();
    await expect(page.locator('body')).toContainText(/login|inloggen|email|wachtwoord|ongeldig|invalid|fout/i);
  });
});
