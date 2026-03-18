import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi } from './helpers';

test('superadmin kan tenant-view starten en via de banner weer verlaten', async ({ page }) => {
  await seedSession(page, 'SUPERADMIN');
  await stubCommonApi(page);
  await page.route('**/api/v1/platform/impersonate/exit', async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true }),
  }));

  await page.goto('/superadmin');
  await page.getByRole('button', { name: /meekijken/i }).first().click();
  await expect(page.getByText(/tenant-view gestart/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /verlaat tenant-view/i })).toBeVisible();
  await page.getByRole('button', { name: /verlaat tenant-view/i }).click();
  await expect(page.getByText(/tenant-view beëindigd/i)).toBeVisible();
});
