import { test, expect } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test('ce dossier is bereikbaar vanuit project 360', async ({ page }) => {
  await openFirstProject360(page);
  await page.getByRole('button', { name: /ce dossier/i }).first().click();
  await expect(page.getByText(/CE Dossier/i)).toBeVisible();
});