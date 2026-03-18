import { expect, test } from '@playwright/test';

const liveEnabled = process.env.PLAYWRIGHT_LIVE_AUTH === '1';
const demoTenant = process.env.PLAYWRIGHT_AUTH_TENANT || 'demo';
const demoEmail = process.env.PLAYWRIGHT_AUTH_EMAIL || 'admin@demo.com';
const demoPassword = process.env.PLAYWRIGHT_AUTH_PASSWORD || 'Admin123!';
const newPassword = process.env.PLAYWRIGHT_AUTH_NEW_PASSWORD || 'Admin1234!';
const suppliedResetToken = process.env.PLAYWRIGHT_AUTH_RESET_TOKEN || '';

async function resetLocalSession(page: import('@playwright/test').Page) {
  await page.evaluate(() => window.localStorage.removeItem('nen1090.session'));
}

test.describe('live auth flows', () => {
  test.skip(!liveEnabled, 'Live auth E2E is alleen bedoeld wanneer PLAYWRIGHT_LIVE_AUTH=1 is gezet.');

  test('login, refresh-trigger en logout tegen live API', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Tenant').fill(demoTenant);
    await page.getByLabel('E-mail').fill(demoEmail);
    await page.getByLabel('Wachtwoord').fill(demoPassword);
    await page.getByRole('button', { name: /inloggen/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.evaluate(() => {
      const raw = window.localStorage.getItem('nen1090.session');
      if (!raw) throw new Error('Geen sessie gevonden');
      const parsed = JSON.parse(raw);
      parsed.token = 'expired-access-token';
      window.localStorage.setItem('nen1090.session', JSON.stringify(parsed));
    });

    await page.goto('/dashboard');
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();

    await page.goto('/logout');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/je bent uitgelogd/i)).toBeVisible();
  });

  test('forgot password toont generieke succesmelding tegen live API', async ({ page }) => {
    await resetLocalSession(page);
    await page.goto('/forgot-password');
    await page.getByLabel('Tenant').fill(demoTenant);
    await page.getByLabel('E-mail').fill(demoEmail);
    await page.getByRole('button', { name: /resetlink aanvragen/i }).click();
    await expect(page.getByText(/resetlink verstuurd/i)).toBeVisible();
  });

  test('reset en change password live met supplied reset token of non-prod API token', async ({ page, request }) => {
    let resetToken = suppliedResetToken;

    if (!resetToken) {
      const response = await request.post(`${process.env.VITE_API_BASE_URL || '/api/v1'}/auth/reset-password/request`, {
        data: { tenant: demoTenant, email: demoEmail },
      });
      expect(response.ok()).toBeTruthy();
      const payload = await response.json();
      resetToken = payload?.reset_token || '';
    }

    test.skip(!resetToken, 'Geen reset token beschikbaar. Zet PLAYWRIGHT_AUTH_RESET_TOKEN of gebruik een non-prod API die reset_token teruggeeft.');

    await page.goto(`/reset-password?token=${encodeURIComponent(resetToken)}`);
    await page.getByLabel('Nieuw wachtwoord').fill(newPassword);
    await page.getByLabel('Herhaal nieuw wachtwoord').fill(newPassword);
    await page.getByRole('button', { name: /wachtwoord opslaan/i }).click();
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel('Tenant').fill(demoTenant);
    await page.getByLabel('E-mail').fill(demoEmail);
    await page.getByLabel('Wachtwoord').fill(newPassword);
    await page.getByRole('button', { name: /inloggen/i }).click();
    await expect(page).toHaveURL(/\/dashboard$/);

    await page.goto('/change-password');
    await page.getByLabel('Huidig wachtwoord').fill(newPassword);
    await page.getByLabel('Nieuw wachtwoord').fill(demoPassword);
    await page.getByLabel('Herhaal nieuw wachtwoord').fill(demoPassword);
    await page.getByRole('button', { name: /wachtwoord wijzigen/i }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByText(/je wachtwoord is gewijzigd/i)).toBeVisible();
  });
});
