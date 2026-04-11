import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard } from '../guards/network.guard';

test.describe('phase D final proof - route assertions', () => {
  test('ce dossier route mag geen verborgen 500 of 404 project-inspection fouten geven', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten/e8e89d84-c24d-4334-a56c-61370665a7cf/ce-dossier');
    await expect(page.locator('body')).toBeVisible();

    const hardFailures = networkErrors.filter((item) => {
      const url = String(item.url || '');
      if (item.status === 500) return true;
      if (/\/api\/v1\/projects\/.+\/inspection/i.test(url) && item.status === 404) return true;
      return false;
    });

    if (hardFailures.length) {
      throw new Error(`CE route blockers gedetecteerd:\n${JSON.stringify(hardFailures, null, 2)}`);
    }

    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
