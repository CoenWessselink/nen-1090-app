import { expect, test } from '@playwright/test';
import { DEFAULT_PROJECT_ID, bootstrapAuthenticatedPage, openFirstProject360 } from './helpers';

test.describe('projects and project 360', () => {
  test('projects table shows expected actions', async ({ page }) => {
    await bootstrapAuthenticatedPage(page, '/projecten');
    await expect(page.getByRole('heading', { name: 'Projecten' })).toBeVisible();
    await expect(page.getByRole('button', { name: /nieuw project/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /open project 360/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /bewerken/i }).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /verwijderen/i }).first()).toBeVisible();
  });

  test('open project 360 lands on overview route', async ({ page }) => {
    await openFirstProject360(page);
    await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/overzicht$`));
    await expect(page.getByRole('button', { name: /nieuwe assembly/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /nieuwe las/i })).toBeVisible();
  });
});
