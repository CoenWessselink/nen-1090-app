import { expect, test } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test.describe('ce dossier and exports', () => {
  test('ce dossier route renders project-bound compliance view', async ({ page }) => {
    await openFirstProject360(page);
    await page.goto(page.url().replace(/\/overzicht$/, '/ce-dossier'));
    await expect(page).toHaveURL(/\/ce-dossier$/);
    await expect(page.getByRole('heading', { name: /ce dossier/i })).toBeVisible();
    await expect(page.locator('main')).toContainText(/score|open acties|status/i);
  });

  test('ce dossier exposes export actions', async ({ page }) => {
    await openFirstProject360(page);
    await page.goto(page.url().replace(/\/overzicht$/, '/ce-dossier'));
    await expect(page.getByRole('button', { name: /snelle pdf-export/i })).toBeVisible();
    await expect(page.locator('main')).toContainText(/exporthistorie|pdf dossier-layout|manifest/i);
  });

  test('document route is project-scoped', async ({ page }) => {
    await openFirstProject360(page);
    await page.goto(page.url().replace(/\/overzicht$/, '/documenten'));
    await expect(page).toHaveURL(/\/documenten$/);
    await expect(page.locator('main')).toContainText(/document|ce/i);
  });
});
