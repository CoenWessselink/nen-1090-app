import { test, expect } from '@playwright/test';

test('rapportage pagina geeft response', async ({ page, baseURL }) => {
  await page.goto(`${baseURL}/rapportage`, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('body')).toBeVisible();
});

test('mogelijke CE route geeft response als route bestaat', async ({ page, baseURL }) => {
  const candidates = [
    `${baseURL}/projecten/1/ce-dossier`,
    `${baseURL}/ce-dossier`,
  ];
  for (const url of candidates) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('body')).toBeVisible();
  }
});
