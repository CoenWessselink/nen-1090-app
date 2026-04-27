import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard, assertNoUnexpectedNetworkErrors } from '../guards/network.guard';

test.describe('phase B hardcore - project 360', () => {
  test('project routes mogen geen onverwachte kritieke API fouten genereren', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();

    // Hard fail op onverwachte backend failures
    assertNoUnexpectedNetworkErrors(networkErrors, [/\/auth\/me/i, /\/auth\/refresh/i]);
    assertNoUnexpectedBrowserErrors(browserErrors);
  });

  test('ce dossier route veroorzaakt geen onverwachte ce/api crash', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/ce-dossier');
    await expect(page.locator('body')).toBeVisible();

    assertNoUnexpectedNetworkErrors(networkErrors, [/\/auth\/me/i, /\/auth\/refresh/i, /\/projects\/[^/]+\/ce-dossier/i]);
    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
