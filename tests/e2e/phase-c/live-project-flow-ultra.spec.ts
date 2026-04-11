import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard, assertNoUnexpectedNetworkErrors } from '../guards/network.guard';

test.describe('phase C ultra - live project flow', () => {
  test('projecten pagina rendert en veroorzaakt geen onverwachte kritieke API fouten', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();

    assertNoUnexpectedNetworkErrors(networkErrors, [/\/auth\/me/i, /\/auth\/refresh/i]);
    assertNoUnexpectedBrowserErrors(browserErrors);
  });

  test('ce dossier pagina rendert zonder onverwachte 500 crash', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/ce-dossier');
    await expect(page.locator('body')).toBeVisible();

    const fatal = networkErrors.filter((item) => item.status === 500);
    if (fatal.length) {
      throw new Error(`CE dossier veroorzaakte 500 fouten:\n${JSON.stringify(fatal, null, 2)}`);
    }

    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
