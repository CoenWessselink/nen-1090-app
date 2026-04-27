import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard } from '../guards/network.guard';

test.describe('phase D final proof - console and network hard fail', () => {
  test('lassen route mag geen 404 inspectie/status en geen 401 refresh fouten produceren', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();

    const hardFailures = networkErrors.filter((item) => {
      const url = String(item.url || '');
      if (/\/api\/v1\/auth\/refresh/i.test(url) && item.status === 401) return true;
      if (/\/api\/v1\/welds\/.+\/status/i.test(url) && item.status === 404) return true;
      if (/\/api\/v1\/projects\/.+\/inspection/i.test(url) && item.status === 404) return true;
      return false;
    });

    if (hardFailures.length) {
      throw new Error(`Live console/API blockers gedetecteerd:\n${JSON.stringify(hardFailures, null, 2)}`);
    }

    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
