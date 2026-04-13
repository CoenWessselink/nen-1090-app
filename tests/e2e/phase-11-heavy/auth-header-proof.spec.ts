import { test, expect } from '@playwright/test';
import { captureAuthRequests, expectNotOnLogin, login } from './_heavy-helper';

test.describe('phase 11 heavy - auth header proof', () => {
  test('auth/me request after login carries authorization or valid session flow', async ({ page }) => {
    const requests = await captureAuthRequests(page);
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expectNotOnLogin(page);

    const meOrRefresh = requests.filter((r) => /\/auth\/(me|refresh)/.test(r.url));
    expect(meOrRefresh.length).toBeGreaterThan(0);
    expect(
      meOrRefresh.some((r) => !!r.auth) || meOrRefresh.some((r) => /\/auth\/refresh/.test(r.url)),
    ).toBeTruthy();
  });
});
