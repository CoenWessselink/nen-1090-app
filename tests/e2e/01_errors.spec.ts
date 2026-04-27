import { test, expect } from '@playwright/test';

test('rapportage route geeft geen pageerror explosie', async ({ page, baseURL }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(String(err)));
  await page.goto(`${baseURL}/rapportage`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
  expect(errors.length).toBeLessThan(5);
});
