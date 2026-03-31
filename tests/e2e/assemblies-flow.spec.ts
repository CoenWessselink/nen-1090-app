import { test, expect } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test('assemblies UI is bereikbaar vanuit project 360', async ({ page }) => {
  await openFirstProject360(page);
  await page.getByRole('button', { name: /assemblies/i }).click();
  await expect(page.getByText(/assemblies/i).first()).toBeVisible();

  const createBtn = page.getByRole('button', { name: /nieuwe assembly/i });
  await expect(createBtn).toBeVisible();

  await createBtn.click();
  await expect(page.getByText(/assembly|code|omschrijving|opslaan|bewaar/i).first()).toBeVisible();
});
