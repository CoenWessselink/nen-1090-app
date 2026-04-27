import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard, assertNoUnexpectedNetworkErrors } from '../guards/network.guard';

test.describe('phase A - project welds live proof', () => {
  test('project shell veroorzaakt geen onverwachte kritieke api fouten', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();

    assertNoUnexpectedNetworkErrors(networkErrors, [/\/auth\/me/i, /\/auth\/refresh/i]);
    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
