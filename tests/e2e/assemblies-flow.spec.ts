import { test, expect } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test('assemblies tab is bereikbaar vanuit project 360', async ({ page }) => {
  await openFirstProject360(page);
  await page.getByRole('button', { name: /^Assemblies$/i }).click();
  await expect(page).toHaveURL(/\/assemblies$/i);
  await expect(page.getByRole('heading', { name: /^Assemblies$/i })).toBeVisible();
});
