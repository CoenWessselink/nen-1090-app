import { expect, test } from '@playwright/test';
import { seedSession, stubCommonApi, DEFAULT_PROJECT_ID, DEFAULT_WELD_ID } from './helpers';

test.beforeEach(async ({ page }) => {
  await seedSession(page, 'ADMIN');
  await stubCommonApi(page);
});

test('refresh on project route keeps context', async ({ page }) => {
  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lascontrole`);
  await page.reload();
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/lascontrole`));
  await expect(page.locator('body')).toContainText(/lascontrole|demo project|l-001/i);
});

test('deep link to weld route is stable', async ({ page }) => {
  await page.goto(`/projecten/${DEFAULT_PROJECT_ID}/lassen/${DEFAULT_WELD_ID}`);
  await expect(page).toHaveURL(new RegExp(`/projecten/${DEFAULT_PROJECT_ID}/lassen/${DEFAULT_WELD_ID}`));
  await expect(page.locator('body')).toContainText(/las|weld|demo project|l-001/i);
});

test('legacy planning route redirects to projecten', async ({ page }) => {
  await page.goto('/planning');
  await expect(page).toHaveURL(/\/projecten$/);
});
