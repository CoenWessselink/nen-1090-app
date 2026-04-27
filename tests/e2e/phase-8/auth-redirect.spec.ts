import { test, expect } from '@playwright/test';

test.describe('phase 8 - auth', () => {
  test('dashboard redirects to login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login(?:$|[?#])/);
  });

  test('login form is visible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/login|inloggen|email|wachtwoord/i);
  });
});
