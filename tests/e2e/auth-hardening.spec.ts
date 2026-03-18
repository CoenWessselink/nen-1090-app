import { expect, test } from '@playwright/test';
import { stubCommonApi } from './helpers';

test('login success redirects to dashboard and stores session', async ({ page }) => {
  await page.route('**/auth/login', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'login-token',
      refresh_token: 'refresh-token',
      user: {
        email: 'admin@demo.com',
        tenant: 'demo',
        tenant_id: 'tenant-demo',
        role: 'ADMIN',
        name: 'Demo Admin',
      },
    }),
  }));
  await stubCommonApi(page);
  await page.goto('/login');
  await page.getByLabel('Tenant').fill('demo');
  await page.getByLabel('E-mail').fill('admin@demo.com');
  await page.getByLabel('Wachtwoord').fill('Admin123!');
  await page.getByRole('button', { name: /inloggen/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => JSON.parse(window.localStorage.getItem('nen1090.session') || '{}').refreshToken)).toBe('refresh-token');
});

test('change password logs user out and returns to login', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nen1090.session', JSON.stringify({
      token: 'e2e-token',
      refreshToken: 'e2e-refresh-token',
      user: { email: 'admin@demo.com', tenant: 'demo', tenantId: 'tenant-demo', role: 'ADMIN', name: 'Demo Admin' },
    }));
  });
  let logoutPayload: unknown = null;
  await page.route('**/auth/change-password', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Wachtwoord gewijzigd' }) }));
  await page.route('**/auth/logout', async (route) => {
    logoutPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, message: 'Je bent uitgelogd.' }) });
  });
  await stubCommonApi(page);
  await page.goto('/change-password');
  await page.getByLabel('Huidig wachtwoord').fill('Admin123!');
  await page.getByLabel('Nieuw wachtwoord').fill('Admin1234!');
  await page.getByLabel('Herhaal nieuw wachtwoord').fill('Admin1234!');
  await page.getByRole('button', { name: /wachtwoord wijzigen/i }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/je wachtwoord is gewijzigd/i)).toBeVisible();
  expect(logoutPayload).toEqual({ refresh_token: 'e2e-refresh-token' });
});

test('invalid reset token shows friendly error', async ({ page }) => {
  await page.route('**/auth/reset-password/confirm', async (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Ongeldige of verlopen resetlink' }),
  }));
  await page.goto('/reset-password?token=bad-token');
  await page.getByLabel('Nieuw wachtwoord').fill('Admin1234!');
  await page.getByLabel('Herhaal nieuw wachtwoord').fill('Admin1234!');
  await page.getByRole('button', { name: /wachtwoord opslaan/i }).click();
  await expect(page.getByText(/deze resetlink is ongeldig of verlopen/i)).toBeVisible();
});
