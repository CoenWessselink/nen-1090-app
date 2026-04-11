import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard, assertNoUnexpectedNetworkErrors } from '../guards/network.guard';

test.describe('phase A - auth and routing live proof', () => {
  test('login route rendert zonder kritieke browser/network fouten', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/login');
    await expect(page.locator('body')).toBeVisible();

    assertNoUnexpectedNetworkErrors(networkErrors, [/\/auth\/login/i]);
    assertNoUnexpectedBrowserErrors(browserErrors);
  });

  test('projecten route veroorzaakt geen onverwachte api 401/404/500', async ({ page }) => {
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
