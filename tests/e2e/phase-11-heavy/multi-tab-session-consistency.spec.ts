import { test, expect } from '@playwright/test';
import { login, expectNotOnLogin } from './_heavy-helper';

test.describe('phase 11 heavy - multi tab session consistency', () => {
  test('new tab inherits usable session after login in first tab', async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    await login(page1);
    await page1.goto('/dashboard', { waitUntil: 'networkidle' });
    await expectNotOnLogin(page1);

    const page2 = await context.newPage();
    await page2.goto('/projecten', { waitUntil: 'networkidle' });
    await expectNotOnLogin(page2);

    await context.close();
  });
});
