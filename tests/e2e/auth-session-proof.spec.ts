import { test, expect } from '@playwright/test';

test('auth pagina laadt en basis shell reageert', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/login`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/login|app\/login/i);
  await expect(page.locator('body')).toBeVisible();
});

test('beschermde route reageert zonder harde browsercrash', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/dashboard`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});
