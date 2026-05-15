import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  for (const route of ['/login', '/dashboard', '/projecten', '/rapportage']) {
    test(`route ${route} renders without crash`, async ({ page }) => {
      await page.goto(route, { waitUntil: 'domcontentloaded' });
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('login page bevat formulier', async ({ page }) => {
    await page.goto('/login', { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toContainText(/login|inloggen|email|wachtwoord/i);
  });
});
