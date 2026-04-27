import { test, expect } from '@playwright/test';

test.describe('lascontrole shell', () => {
  test('lassen route resolves', async ({ page }) => {
    await page.goto('/projecten/demo/lassen');
    await expect(page.locator('body')).toBeVisible();
  });

  test('nieuwe las route resolves', async ({ page }) => {
    await page.goto('/projecten/demo/lassen/nieuw');
    await expect(page.locator('body')).toBeVisible();
  });

  test('inspectie route resolves', async ({ page }) => {
    await page.goto('/projecten/demo/lassen/demo-weld/inspectie');
    await expect(page.locator('body')).toBeVisible();
  });

  test('ce dossier route resolves', async ({ page }) => {
    await page.goto('/projecten/demo/ce-dossier');
    await expect(page.locator('body')).toBeVisible();
  });
});
