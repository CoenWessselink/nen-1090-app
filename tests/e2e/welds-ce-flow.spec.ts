import { test, expect } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test('welds, lascontrole en ce dossier zijn bereikbaar', async ({ page }) => {
  await openFirstProject360(page);

  await page.getByRole('button', { name: /lassen/i }).click();
  await expect(page.getByText(/lassen|las/i).first()).toBeVisible();

  await page.getByRole('button', { name: /lascontrole/i }).first().click();
  await expect(page.getByText(/inspect|controle|lascontrole/i).first()).toBeVisible();

  await page.getByRole('button', { name: /ce dossier/i }).first().click();
  await expect(page.getByText(/ce dossier|compliance|export/i).first()).toBeVisible();
});
