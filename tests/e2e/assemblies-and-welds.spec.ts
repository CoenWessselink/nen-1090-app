import { expect, test } from '@playwright/test';
import { openFirstProject360 } from './helpers';

test.describe('assemblies and welds within project context', () => {
  test('project overview exposes assembly and weld actions', async ({ page }) => {
    await openFirstProject360(page);
    await expect(page.getByRole('button', { name: /nieuwe assembly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nieuwe las/i })).toBeVisible();
  });

  test('assemblies route is project-scoped', async ({ page }) => {
    await openFirstProject360(page);
    await page.goto(page.url().replace(/\/overzicht$/, '/assemblies'));
    await expect(page).toHaveURL(/\/assemblies$/);
    await expect(page.locator('main')).toContainText(/assembly|assemblies|project/i);
  });

  test('lassen route is project-scoped', async ({ page }) => {
    await openFirstProject360(page);
    await page.goto(page.url().replace(/\/overzicht$/, '/lassen'));
    await expect(page).toHaveURL(/\/lassen$/);
    await expect(page.locator('main')).toContainText(/las|lassen|lascontrole/i);
  });

  test('lascontrole route is project-scoped', async ({ page }) => {
    await openFirstProject360(page);
    await page.goto(page.url().replace(/\/overzicht$/, '/lascontrole'));
    await expect(page).toHaveURL(/\/lascontrole$/);
    await expect(page.locator('main')).toContainText(/lascontrole|inspect/i);
  });
});
