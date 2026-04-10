import { test, expect } from '@playwright/test';

for (const route of ['/login', '/dashboard', '/projecten', '/rapportage']) {
  test(`route ${route} toont body`, async ({ page, baseURL }) => {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  });
}
