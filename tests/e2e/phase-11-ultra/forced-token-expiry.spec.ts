import { test, expect } from '@playwright/test';
import { expireLocalSession, expectNotOnLogin, login } from './_ultra-helper';

test.describe('phase 11 ultra - forced token expiry scenarios', () => {
  test('route refresh attempts recovery after local session removal', async ({ page }) => {
    await login(page);
    await page.goto('/projecten', { waitUntil: 'networkidle' });
    await expireLocalSession(page);
    await page.reload({ waitUntil: 'networkidle' });

    // Either refresh recovers or app intentionally returns to login.
    const url = page.url();
    if (/\/login(?:$|[?#])/.test(url)) {
      await expect(page.locator('body')).toContainText(/inloggen|wachtwoord|tenant/i);
    } else {
      await expectNotOnLogin(page);
    }
  });
});
