import { expect, test } from '@playwright/test';
import { stubCommonApi } from './helpers';

test('deep link redirect keeps query string after login', async ({ page }) => {
  await stubCommonApi(page);
  await page.route('**/auth/login', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      access_token: 'login-token',
      refresh_token: 'refresh-token',
      user: { email: 'admin@demo.com', tenant: 'demo', tenant_id: 'tenant-demo', role: 'ADMIN', name: 'Demo Admin' },
    }),
  }));

  await page.goto('/projecten?filter=open');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/na inloggen ga je terug naar/i)).toContainText('/projecten?filter=open');
  await page.getByLabel('Tenant').fill('demo');
  await page.getByLabel('E-mail').fill('admin@demo.com');
  await page.getByLabel('Wachtwoord').fill('Admin123!');
  await page.getByRole('button', { name: /inloggen/i }).click();
  await expect(page).toHaveURL(/\/projecten\?filter=open$/);
});

test('expired access token with revoked refresh sends user back to login once', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nen1090.session', JSON.stringify({
      token: 'expired-token',
      refreshToken: 'revoked-refresh',
      user: { email: 'admin@demo.com', tenant: 'demo', tenantId: 'tenant-demo', role: 'ADMIN', name: 'Demo Admin' },
    }));
  });
  let refreshCalls = 0;
  await page.route('**/auth/refresh', async (route) => {
    refreshCalls += 1;
    await route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Refresh token revoked' }) });
  });
  await page.route('**/health**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
  await page.route('**/api/projects**', async (route) => route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ detail: 'Invalid token' }) }));
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/je sessie is verlopen/i)).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('nen1090.session'))).toBeNull();
  expect(refreshCalls).toBe(1);
});

test('tenant mismatch response clears session and shows login page', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nen1090.session', JSON.stringify({
      token: 'valid-token',
      refreshToken: 'refresh-token',
      user: { email: 'admin@demo.com', tenant: 'demo', tenantId: 'tenant-demo', role: 'ADMIN', name: 'Demo Admin' },
    }));
  });
  await page.route('**/health**', async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) }));
  await page.route('**/api/projects**', async (route) => route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ detail: 'Tenant header komt niet overeen met de sessie' }) }));
  await page.goto('/projecten');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(/actieve tenant/i)).toBeVisible();
});

test('forgot password rate limit shows API error and not generic success', async ({ page }) => {
  await page.route('**/auth/reset-password/request', async (route) => route.fulfill({
    status: 429,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Te veel resetverzoeken. Probeer het later opnieuw.' }),
  }));
  await page.goto('/forgot-password');
  await page.getByLabel('Tenant').fill('demo');
  await page.getByLabel('E-mail').fill('admin@demo.com');
  await page.getByRole('button', { name: /resetlink aanvragen/i }).click();
  await expect(page.getByText(/te veel resetverzoeken/i)).toBeVisible();
  await expect(page.getByText(/resetlink verstuurd/i)).toHaveCount(0);
});

test('change password with wrong current password stays on page', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('nen1090.session', JSON.stringify({
      token: 'e2e-token',
      refreshToken: 'e2e-refresh-token',
      user: { email: 'admin@demo.com', tenant: 'demo', tenantId: 'tenant-demo', role: 'ADMIN', name: 'Demo Admin' },
    }));
  });
  await page.route('**/auth/change-password', async (route) => route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ detail: 'Huidig wachtwoord is onjuist' }),
  }));
  await stubCommonApi(page);
  await page.goto('/change-password');
  await page.getByLabel('Huidig wachtwoord').fill('Wrong123!');
  await page.getByLabel('Nieuw wachtwoord').fill('Admin1234!');
  await page.getByLabel('Herhaal nieuw wachtwoord').fill('Admin1234!');
  await page.getByRole('button', { name: /wachtwoord wijzigen/i }).click();
  await expect(page).toHaveURL(/\/change-password$/);
  await expect(page.getByText(/huidig wachtwoord is onjuist/i)).toBeVisible();
});
