import { test, expect } from '@playwright/test';

const routes = ['/projecten', '/rapportage', '/dashboard'];

for (const route of routes) {
  test(`route ${route} toont body`, async ({ page, baseURL }) => {
    await page.goto(`${baseURL}${route}`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
    const text = await page.locator('body').innerText();
    expect(text.length).toBeGreaterThan(0);
  });
}
