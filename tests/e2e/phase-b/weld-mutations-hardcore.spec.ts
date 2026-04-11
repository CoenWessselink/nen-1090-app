import { test, expect } from '@playwright/test';
import { attachBrowserGuard, assertNoUnexpectedBrowserErrors } from '../guards/browser.guard';
import { attachNetworkGuard } from '../guards/network.guard';

test.describe('phase B hardcore - weld mutations', () => {
  test('lassen flow logt kritieke weld endpoint fouten expliciet', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];
    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto('/projecten');
    await expect(page.locator('body')).toBeVisible();

    const weldRelated = networkErrors.filter((item) => /\/welds/i.test(item.url));
    // Deze test is expres hard-opsporend: als er weld 404/500's zijn, worden ze zichtbaar in output.
    if (weldRelated.length) {
      throw new Error(`Weld endpoint failures gedetecteerd:\n${JSON.stringify(weldRelated, null, 2)}`);
    }

    assertNoUnexpectedBrowserErrors(browserErrors);
  });
});
