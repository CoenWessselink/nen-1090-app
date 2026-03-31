import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage } from './helpers';

test('shell keeps core navigation and topbar search visible', async ({ page }) => {
  await bootstrapAuthenticatedPage(page, '/projecten');
  await expect(page.getByRole('textbox', { name: /zoek in projecten, lassen, documenten en inspecties/i })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Uitloggen' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Dashboard' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Instellingen' })).toBeVisible();
});
