import { test, expect } from '@playwright/test';

const DEMO_EMAIL = process.env.DEMO_EMAIL || 'admin@demo.com';
const DEMO_PASSWORD = process.env.DEMO_PASSWORD || 'Admin123!';
const DEMO_TENANT = process.env.DEMO_TENANT || 'demo';

test.describe('live auth proof', () => {
  test('demo login werkt end-to-end', async ({ page }) => {
    await page.goto('/login');

    await page.getByLabel(/tenant/i).fill(DEMO_TENANT);
    await page.getByLabel(/e-mail/i).fill(DEMO_EMAIL);
    await page.getByLabel(/wachtwoord/i).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: /inloggen/i }).click();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page).toHaveURL(/dashboard|projecten|rapportage|instellingen/i);
  });
});
