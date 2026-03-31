import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi, DEFAULT_PROJECT_ID } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
});

test('documentenroute werkt binnen projectcontext', async ({ page }) => {
  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/documenten`);
  await expect(page.locator('body')).toContainText(/document|wps-001|ce|dossier/i);
});

test('ce dossier toont status en mist geen raw json', async ({ page }) => {
  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/ce-dossier`);
  const body = page.locator('body');
  await expect(body).toContainText(/ce|dossier|gereed|behandeling|checklist/i);
  await expect(body).not.toContainText(/unknown-project|download json|\{\s*"/i);
});

test('legacy ce route redirects to projecten', async ({ page }) => {
  await page.goto('/ce-dossier');
  await expect(page).toHaveURL(/\/projecten$/);
});
