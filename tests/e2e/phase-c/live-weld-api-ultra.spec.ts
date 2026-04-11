import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard } from '../guards/network.guard';

test.describe('phase C ultra - weld api visibility', () => {
  test('weld gerelateerde API fouten worden hard zichtbaar', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();

    const weldRelated = networkErrors.filter((item) => /\/welds/i.test(item.url));
    const hardFailures = weldRelated.filter((item) => item.status === 404 || item.status === 500 || item.stage === 'requestfailed');

    if (hardFailures.length) {
      throw new Error(`Weld endpoint hard failures:\n${JSON.stringify(hardFailures, null, 2)}`);
    }

    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
