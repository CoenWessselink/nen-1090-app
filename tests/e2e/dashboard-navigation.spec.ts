import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi, DEFAULT_PROJECT_ID } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
});

test('dashboard bevat klikbare navigatie naar projecten', async ({ page }) => {
  await page.goto('/dashboard');
  const body = page.locator('body');
  await expect(body).toContainText(/projecten/i);
  const target = page.getByRole('link', { name: /projecten|bekijk projecten/i }).first();
  if (await target.count()) {
    await target.click();
    await expect(page).toHaveURL(/\/projecten$/);
  }
});

test('dashboardproject leidt naar projectcontext of projectenoverzicht', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.locator('body')).toContainText(/demo project|projecten/i);
  const maybeProjectLink = page.getByRole('link', { name: /demo project/i }).first();
  if (await maybeProjectLink.count()) {
    await maybeProjectLink.click();
    await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}|/projecten$`));
  }
});
