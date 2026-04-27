import { test, expect } from '@playwright/test';

test.describe('phase 9 - api/ui contract proof', () => {
  test('dashboard unauthenticated redirects to login', async ({ page }) => {
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/login(?:$|[?#])/);
  });

  test('login page is visible', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/login|inloggen|email|wachtwoord/i);
  });
});
