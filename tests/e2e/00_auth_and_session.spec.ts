import { test, expect } from '@playwright/test';

test('login route reageert visueel', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});

test('dashboard route reageert zonder crash', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});

test('refresh op projecten route behoudt render', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/projecten`, { waitUntil: 'domcontentloaded' });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});
