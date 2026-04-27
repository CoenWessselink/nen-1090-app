import { test, expect } from '@playwright/test';
import { attachBrowserGuard } from '../guards/browser.guard';
import { attachNetworkGuard } from '../guards/network.guard';

const DEFAULT_PROJECT_ID = process.env.TEST_PROJECT_ID || 'e8e89d84-c24d-4334-a56c-61370665a7cf';

test.describe('phase D final proof - route assertions', () => {
  test('ce dossier route mag geen verborgen legacy CE/export of project-inspection fouten geven', async ({ page }) => {
    const networkErrors: any[] = [];
    const browserErrors: any[] = [];

    attachNetworkGuard(page, networkErrors);
    attachBrowserGuard(page, browserErrors);

    await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`, { waitUntil: 'networkidle' });
    await expect(page.locator('body')).toBeVisible();

    const hardFailures = networkErrors.filter((item) => {
      const url = String(item.url || '');

      if (item.status === 500) return true;
      if (/\/api\/v1\/projects\/.+\/inspection(\?|$)/i.test(url) && item.status === 404) return true;
      if (url.includes('/exports/preview') && item.status >= 400) return true;
      if (url.includes('/ce_export/') && item.status >= 400) return true;
      if (url.includes('/exports/pdf/download') && item.status >= 400) return true;

      return false;
    });

    if (hardFailures.length) {
      throw new Error(`CE route blockers gedetecteerd:\n${JSON.stringify(hardFailures, null, 2)}`);
    }

    const unexpectedRouteConsoleErrors = browserErrors.filter((item) => {
      const text = String(item.text || '');
      return /\/ce_export\//i.test(text)
        || /\/exports\/pdf\/download/i.test(text)
        || /\/exports\/preview/i.test(text)
        || /\/api\/v1\/projects\/.+\/inspection(\?|\s|$)/i.test(text);
    });

    if (unexpectedRouteConsoleErrors.length) {
      throw new Error(`CE route console blockers gedetecteerd:\n${JSON.stringify(unexpectedRouteConsoleErrors, null, 2)}`);
    }
  });
});
