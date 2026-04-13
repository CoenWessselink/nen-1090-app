import { test, expect } from '@playwright/test';

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:4173';

test('fase 3 rapportage toont zoekveld en pdf-paneel', async ({ page }) => {
  await page.goto(`${BASE_URL}/rapportage`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('reports-search-input')).toBeVisible();
  await expect(page.getByTestId('reports-pdf-panel')).toBeVisible();
});
