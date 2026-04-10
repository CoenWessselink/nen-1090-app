import { test, expect } from '@playwright/test';

test('projecten pagina kan geladen worden voor project360 smoke', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/projecten`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});
