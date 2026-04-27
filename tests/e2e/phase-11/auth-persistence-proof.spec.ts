import { test, expect } from '@playwright/test';
import { login, expectAppShell, expectStillAuthenticated, snapshotAuthStorage } from './_auth-proof-helper';

test.describe('phase 11 expansion - auth persistence proof', () => {
  test('login writes persistent auth state to storage or cookies', async ({ page }) => {
    await login(page);
    await expectAppShell(page);

    const snapshot = await snapshotAuthStorage(page);

    expect(
      Boolean(snapshot.ls || snapshot.ss || /nen1090_access_token|access_token|auth_token/i.test(snapshot.cookies)),
    ).toBeTruthy();
  });

  test('refresh on dashboard keeps user out of login screen', async ({ page }) => {
    await login(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    await expectStillAuthenticated(page);
    await expect(page.locator('body')).toContainText(/dashboard|projecten|rapportage|instellingen/i);
  });

  test('direct open of protected route after login keeps shell alive', async ({ page }) => {
    await login(page);
    await page.goto('/projecten', { waitUntil: 'networkidle' });
    await expectStillAuthenticated(page);
    await expect(page.locator('body')).toContainText(/projecten|zoek|nieuw/i);
  });
});
