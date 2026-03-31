import { expect, test } from '@playwright/test';
import { bootstrapAuthenticatedPage, isLiveMode } from './helpers';

test.describe('auth and routing', () => {
  test('redirects anonymous user to login', async ({ page }) => {
    await page.goto('/projecten');
    await expect(page).toHaveURL(/\/login$/);
  });

  test('authenticated user can open dashboard and projects', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/dashboard');
    await expect(page.getByRole('link', { name: 'Projecten' })).toBeVisible();
    await page.getByRole('link', { name: 'Projecten' }).click();
    await expect(page).toHaveURL(/\/projecten$/);
    await expect(page.getByRole('heading', { name: 'Projecten' })).toBeVisible();
  });

  test('legacy top-level routes redirect to projecten', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/lascontrole');
    await expect(page).toHaveURL(/\/projecten$/);
    await page.goto('/ce-dossier');
    await expect(page).toHaveURL(/\/projecten$/);
    await page.goto('/planning');
    await expect(page).toHaveURL(/\/projecten$/);
  });

  test('superadmin route is only asserted in live or stub auth mode', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/superadmin', { role: 'SUPERADMIN' });
    if (isLiveMode()) {
      await expect(page.locator('main')).toBeVisible();
    } else {
      await expect(page.getByRole('link', { name: 'Superadmin' })).toBeVisible();
    }
  });
});
