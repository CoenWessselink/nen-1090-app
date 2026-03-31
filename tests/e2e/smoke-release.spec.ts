import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers';

test('release smoke: dashboard -> projecten -> rapportage', async ({ page }) => {
  await bootstrapAuthenticatedPage(page, '/dashboard');
  await page.getByRole('link', { name: 'Projecten' }).click();
  await expect(page).toHaveURL(/\/projecten$/);
  await page.getByRole('link', { name: 'Rapportage' }).click();
  await expect(page).toHaveURL(/\/rapportage$/);
  await expect(page.locator('main')).toBeVisible();
});
