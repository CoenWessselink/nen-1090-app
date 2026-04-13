import { test, expect } from '@playwright/test';
import { captureAuthRequests, login } from './_ultra-helper';

test.describe('phase 11 ultra - refresh rollover proof', () => {
  test('protected route reload records auth lifecycle requests', async ({ page }) => {
    const requests = await captureAuthRequests(page);
    await login(page);
    await page.goto('/projecten', { waitUntil: 'networkidle' });
    await page.reload({ waitUntil: 'networkidle' });

    const authUrls = requests.map((r) => r.url).join('\n');
    expect(/\/auth\/me|\/auth\/refresh/.test(authUrls)).toBeTruthy();
  });
});
