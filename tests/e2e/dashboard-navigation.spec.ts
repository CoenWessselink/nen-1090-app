import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers';

test('dashboard shell renders and routes into operational pages', async ({ page }) => {
  await bootstrapAuthenticatedPage(page, '/dashboard');
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Projecten' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Rapportage' })).toBeVisible();

  await page.getByRole('link', { name: 'Projecten' }).click();
  await expect(page).toHaveURL(/\/projecten$/);
  await expect(page.getByRole('heading', { name: 'Projecten' })).toBeVisible();

  await page.getByRole('link', { name: 'Rapportage' }).click();
  await expect(page).toHaveURL(/\/rapportage$/);
});
